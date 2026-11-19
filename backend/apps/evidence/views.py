"""
Evidence app views — Phase 4 Digital Evidence Repository & Management APIs
"""
import hashlib
import mimetypes
from django.db import models
from django.utils import timezone
from django.http import Http404, HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.mixins import TenantMixin
from core.permissions import IsSuperAdminOrIQAC
from apps.audit.utils import log_action
from apps.activities.models import Document, DocumentCategory, Activity
from .models import Evidence
from .serializers import EvidenceListSerializer, EvidenceDetailSerializer
from .services import EvidenceSearchService, EvidenceStatsService, EvidenceExportService


class EvidenceViewSet(TenantMixin, viewsets.ReadOnlyModelViewSet):
    """
    Centralized, searchable, verified digital evidence repository.
    Strictly isolated by tenant, department, and faculty role permissions.
    """
    queryset = Evidence.objects.all().select_related(
        'faculty', 'department', 'academic_year', 'document', 'activity', 'college'
    ).prefetch_related('activity__documents')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EvidenceDetailSerializer
        return EvidenceListSerializer

    def perform_content_negotiation(self, request, force=False):
        if getattr(self, 'action', None) in ['export', 'bulk_zip']:
            renderers = self.get_renderers()
            return (renderers[0], renderers[0].media_type)
        return super().perform_content_negotiation(request, force=force)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return Evidence.objects.none()

        # 1. Role-based isolation
        if user.role == 'FACULTY':
            qs = qs.filter(faculty=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            if user.department:
                qs = qs.filter(department=user.department)
            else:
                return Evidence.objects.none()
        elif user.role in ['IQAC', 'COLLEGE_MANAGEMENT']:
            if user.college:
                qs = qs.filter(college=user.college)
            else:
                return Evidence.objects.none()
        elif user.role == 'SUPER_ADMIN':
            pass

        # 2. Archive filtering (Default: only active verified evidence)
        status_param = self.request.query_params.get('status')
        include_archived = self.request.query_params.get('include_archived', 'false').lower() == 'true'
        
        if getattr(self, 'action', None) in ['restore', 'archive', 'retrieve']:
            pass  # Target specific record by ID regardless of archive status
        elif status_param == 'ARCHIVED':
            qs = qs.filter(status='ARCHIVED')
        elif status_param == 'ALL' or include_archived:
            pass  # Return all statuses
        else:
            qs = qs.filter(status='ACTIVE')

        # 3. Apply smart filters & natural search
        qs = EvidenceSearchService.apply_smart_filters(qs, self.request.query_params)
        return qs.order_by('-created_at')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Log view in audit trail
        log_action(
            actor=request.user,
            action='EVIDENCE_VIEWED',
            instance=instance,
            request=request,
            comment=f'User {request.user.email} opened evidence dossier: "{instance.title}".'
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Repository summary metrics & breakdowns."""
        if not request.user.college and request.user.role != 'SUPER_ADMIN':
            return Response({'detail': 'User has no assigned institution.'}, status=status.HTTP_400_BAD_REQUEST)
        
        college = request.user.college
        stats_data = EvidenceStatsService.get_repository_stats(college, request.user)
        return Response(stats_data)

    @action(detail=False, methods=['get'])
    def export(self, request):
        """
        Exports filtered repository metadata to CSV or Excel (.xlsx).
        Strictly applies the current user's role-based filters.
        """
        qs = self.filter_queryset(self.get_queryset())
        export_format = request.query_params.get('format', 'csv').lower()

        log_action(
            actor=request.user,
            action='EVIDENCE_EXPORTED',
            instance=request.user.college,
            request=request,
            comment=f'Exported {qs.count()} evidence records in {export_format.upper()} format.'
        )

        if export_format in ['excel', 'xlsx']:
            return EvidenceExportService.generate_excel(qs)
        return EvidenceExportService.generate_csv(qs)

    @action(detail=False, methods=['post'], url_path='bulk-zip')
    def bulk_zip(self, request):
        """
        Downloads supporting certificate files for selected evidence records as a single ZIP archive.
        """
        evidence_ids = request.data.get('ids', [])
        qs = self.get_queryset()
        if evidence_ids:
            qs = qs.filter(id__in=evidence_ids)
        else:
            qs = self.filter_queryset(qs)[:50] # Safety cap at 50 if no specific IDs provided

        log_action(
            actor=request.user,
            action='EVIDENCE_BULK_DOWNLOADED',
            instance=request.user.college,
            request=request,
            comment=f'Bulk downloaded certificate files for {qs.count()} evidence items as ZIP.'
        )

        return EvidenceExportService.generate_zip(qs)

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdminOrIQAC])
    def archive(self, request, pk=None):
        """
        Archives verified institutional evidence (Section 34).
        Preserves history; excludes from default search queries.
        """
        instance = self.get_object()
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'detail': 'An archive rationale is required.'}, status=status.HTTP_400_BAD_REQUEST)

        instance.status = 'ARCHIVED'
        instance.archived_at = timezone.now()
        instance.archived_by = request.user
        instance.archive_reason = reason
        instance.save()

        log_action(
            actor=request.user,
            action='EVIDENCE_ARCHIVED',
            instance=instance,
            request=request,
            comment=f'Archived evidence "{instance.title}". Reason: {reason}'
        )

        return Response({
            'status': 'ARCHIVED',
            'message': f'Evidence "{instance.title}" successfully moved to archive repository.'
        })

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdminOrIQAC])
    def restore(self, request, pk=None):
        """Restores archived evidence back to active repository."""
        instance = self.get_object()
        instance.status = 'ACTIVE'
        instance.archived_at = None
        instance.archived_by = None
        instance.archive_reason = ''
        instance.save()

        log_action(
            actor=request.user,
            action='EVIDENCE_RESTORED',
            instance=instance,
            request=request,
            comment=f'Restored evidence "{instance.title}" to active repository.'
        )

        return Response({
            'status': 'ACTIVE',
            'message': f'Evidence "{instance.title}" successfully restored to active repository.'
        })

    @action(detail=True, methods=['post'], url_path='add-document')
    def add_document(self, request, pk=None):
        """
        Allows authorized users to attach supplementary documents (Attendance, Report, Photos)
        to the activity behind this evidence (Section 16, 17).
        """
        evidence = self.get_object()
        activity = evidence.activity
        user = request.user

        # Permission check: IQAC, HOD (same dept), In-charge (same dept), or author Faculty
        can_attach = (
            user.role in ['SUPER_ADMIN', 'IQAC'] or
            (user.role in ['HOD', 'DEPARTMENT_INCHARGE'] and user.department_id == activity.department_id) or
            (user.role == 'FACULTY' and activity.faculty_id == user.id)
        )
        if not can_attach:
            raise PermissionDenied("You do not have permission to attach documents to this evidence.")

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        # File size check (10MB)
        if uploaded_file.size > 10 * 1024 * 1024:
            return Response({'detail': 'File size must not exceed 10 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        # Allowed extensions
        allowed_exts = ('.pdf', '.jpg', '.jpeg', '.png')
        if not any(uploaded_file.name.lower().endswith(ext) for ext in allowed_exts):
            return Response({'detail': 'Only PDF, JPG, JPEG, and PNG files are allowed.'}, status=status.HTTP_400_BAD_REQUEST)

        from core.validators import validate_file_security
        validate_file_security(uploaded_file)

        # Compute SHA-256 hash
        hasher = hashlib.sha256()
        for chunk in uploaded_file.chunks():
            hasher.update(chunk)
        file_hash = hasher.hexdigest()

        # Duplicate check warning
        existing_doc = Document.objects.filter(college=user.college, file_hash=file_hash).first()
        is_duplicate = existing_doc is not None
        duplicate_warning = (
            f'Possible duplicate file detected: matches "{existing_doc.file_name}" uploaded on {existing_doc.created_at.strftime("%Y-%m-%d")}.'
            if is_duplicate else None
        )

        category_val = request.data.get('category')
        doc_category = None
        if category_val:
            import uuid
            try:
                cat_uuid = uuid.UUID(str(category_val))
                doc_category = DocumentCategory.objects.filter(id=cat_uuid).first()
            except (ValueError, AttributeError):
                doc_category = DocumentCategory.objects.filter(code__iexact=str(category_val).strip()).first()

        if doc_category and doc_category.college_id not in (None, activity.college_id):
            raise ValidationError({'category': 'Category belongs to another institution.'})
        uploaded_file.seek(0)

        doc_type = request.data.get('document_type', 'SUPPORTING')
        description = request.data.get('description', '')

        # Versioning: increment version if replacing or adding revision
        current_version = activity.documents.count() + 1

        new_doc = Document.objects.create(
            activity=activity,
            college=activity.college,
            department=activity.department,
            uploaded_by=user,
            file=uploaded_file,
            file_name=uploaded_file.name,
            original_filename=uploaded_file.name,
            file_size=uploaded_file.size,
            mime_type=uploaded_file.content_type or mimetypes.guess_type(uploaded_file.name)[0] or 'application/pdf',
            file_hash=file_hash,
            document_type=doc_type,
            category=doc_category,
            description=description,
            version=current_version,
            is_primary=False,
            status='ACTIVE'
        )

        log_action(
            actor=user,
            action='EVIDENCE_DOCUMENT_ATTACHED',
            instance=evidence,
            request=request,
            comment=f'Attached supplementary document "{new_doc.file_name}" to evidence "{evidence.title}".'
        )

        return Response({
            'message': 'Supplementary document successfully attached to evidence dossier.',
            'document_id': str(new_doc.id),
            'file_name': new_doc.file_name,
            'is_duplicate': is_duplicate,
            'duplicate_warning': duplicate_warning,
            'preview_url': f"/api/documents/{new_doc.id}/preview/",
            'download_url': f"/api/documents/{new_doc.id}/download/",
            'document': {
                'id': str(new_doc.id),
                'file_name': new_doc.file_name,
                'file_hash': new_doc.file_hash,
                'file_size': new_doc.file_size,
                'category': doc_category.name if doc_category else None,
            }
        }, status=status.HTTP_201_CREATED)
