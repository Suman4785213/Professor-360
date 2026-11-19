from django.db import transaction
import hashlib
import mimetypes
from django.db import models
from django.utils import timezone
from django.http import FileResponse, Http404
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.mixins import TenantMixin
from core.permissions import IsSuperAdminOrIQAC
from apps.audit.utils import log_action
from apps.verification.models import VerificationRecord, VerificationLog, VerificationAction
from apps.notifications.utils import notify_on_submission
from .models import Activity, ActivityCategory, Document, DocumentCategory, ActivityStatus
from .serializers import ActivitySerializer, ActivityCategorySerializer, DocumentSerializer, DocumentCategorySerializer


class ActivityCategoryViewSet(TenantMixin, viewsets.ModelViewSet):
    """
    CRUD for configurable activity categories.
    System defaults (college=None) are available to all institutions.
    """
    queryset = ActivityCategory.objects.all()
    serializer_class = ActivityCategorySerializer
    filterset_fields = ['is_active']
    search_fields = ['name', 'code', 'description']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ActivityCategory.objects.none()
        if user.role == 'SUPER_ADMIN':
            return ActivityCategory.objects.all()
        # Return global categories (college is null) OR institution's custom categories
        return ActivityCategory.objects.filter(models.Q(college__isnull=True) | models.Q(college=user.college))

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdminOrIQAC()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        college = user.college if user.role != 'SUPER_ADMIN' else None
        serializer.save(college=college)


class ActivityViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = Activity.objects.all().select_related(
        'faculty', 'department', 'academic_year', 'category', 'college'
    ).prefetch_related('documents')
    serializer_class = ActivitySerializer
    filterset_fields = ['department', 'academic_year', 'category', 'activity_type', 'status', 'faculty']
    search_fields = ['title', 'organizer', 'description', 'certificate_number', 'faculty__first_name', 'faculty__last_name']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return Activity.objects.none()
        if user.role == 'FACULTY':
            return qs.filter(faculty=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            return qs.filter(department=user.department) if user.department_id else qs.none()
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != 'FACULTY' and not user.is_staff:
            raise PermissionDenied("Only faculty members can initiate activity submissions.")

        extra_kwargs = {
            'college': user.college,
            'department': user.department,
            'faculty': user,
            'status': ActivityStatus.DRAFT,
        }
        if not serializer.validated_data.get('academic_year') and user.college:
            from apps.academic_years.models import AcademicYear
            curr_ay = AcademicYear.objects.filter(college=user.college, is_current=True).first() or \
                      AcademicYear.objects.filter(college=user.college, is_active=True).order_by('-start_date').first()
            if curr_ay:
                extra_kwargs['academic_year'] = curr_ay

        activity = serializer.save(**extra_kwargs)

        VerificationRecord.objects.get_or_create(
            activity=activity,
            defaults={'college': user.college, 'current_status': ActivityStatus.DRAFT}
        )

        log_action(
            actor=user,
            action='ACTIVITY_CREATED',
            instance=activity,
            request=self.request,
            comment=f'Created activity draft: "{activity.title}".'
        )

    def perform_update(self, serializer):
        activity = self.get_object()
        if self.request.user.role != 'SUPER_ADMIN' and (self.request.user.role != 'FACULTY' or activity.faculty_id != self.request.user.id):
            raise PermissionDenied('Only the author may edit this activity.')
        if not activity.is_editable:
            raise ValidationError(f"Activity in status '{activity.status}' cannot be edited.")
        updated_activity = serializer.save()

        log_action(
            actor=self.request.user,
            action='ACTIVITY_UPDATED',
            instance=updated_activity,
            request=self.request,
            comment=f'Updated activity details for "{updated_activity.title}".'
        )

    def perform_destroy(self, instance):
        if self.request.user.role != 'FACULTY' or instance.status != ActivityStatus.DRAFT or instance.faculty != self.request.user:
            raise PermissionDenied("Only draft activities can be deleted by the author.")
        log_action(
            actor=self.request.user,
            action='ACTIVITY_DELETED',
            instance=instance,
            request=self.request,
            comment=f'Deleted draft activity: "{instance.title}".'
        )
        instance.delete()

    @action(detail=True, methods=['post'], url_path='submit')
    @transaction.atomic
    def submit_for_verification(self, request, pk=None):
        activity = self.get_object()
        activity = Activity.objects.select_for_update().get(pk=activity.pk)
        if activity.faculty != request.user:
            return Response({'detail': 'Only the author faculty can submit this activity.'}, status=status.HTTP_403_FORBIDDEN)
        if not activity.is_editable:
            return Response({'detail': f'Cannot submit activity currently in status {activity.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        prev_status = activity.status
        is_resubmission = prev_status in [
            ActivityStatus.RETURNED_TO_FACULTY,
            ActivityStatus.REJECTED_INCHARGE,
            ActivityStatus.REJECTED_HOD,
            ActivityStatus.REJECTED_IQAC
        ]

        activity.status = ActivityStatus.PENDING_INCHARGE
        activity.save()

        v_rec, _ = VerificationRecord.objects.get_or_create(
            activity=activity,
            defaults={'college': activity.college, 'current_status': activity.status}
        )
        v_rec.current_status = ActivityStatus.PENDING_INCHARGE
        v_rec.save()

        action_type = VerificationAction.RESUBMITTED if is_resubmission else VerificationAction.SUBMITTED
        comment_text = request.data.get('comment', 'Submitted for verification.' if not is_resubmission else 'Resubmitted with corrections.')

        VerificationLog.objects.create(
            verification_record=v_rec,
            actor=request.user,
            role=request.user.role,
            action=action_type,
            previous_status=prev_status,
            new_status=ActivityStatus.PENDING_INCHARGE,
            comment=comment_text
        )

        # Notify Department In-charge
        notify_on_submission(activity, sender=request.user)

        # Log system audit entry
        log_action(
            actor=request.user,
            action='ACTIVITY_SUBMITTED' if not is_resubmission else 'ACTIVITY_RESUBMITTED',
            instance=activity,
            request=request,
            comment=f'Activity "{activity.title}" submitted to Department In-charge.'
        )

        return Response({
            'status': activity.status,
            'message': 'Activity successfully submitted to Department In-charge for verification.'
        })

    @action(detail=False, methods=['post'], url_path='check-duplicate')
    def check_duplicate(self, request):
        """
        Duplicate protection: Checks if an activity with identical title or parameters
        already exists for this faculty member.
        """
        title = request.data.get('title', '').strip()
        academic_year_id = request.data.get('academic_year')
        category_id = request.data.get('category')

        if not title:
            return Response({'is_duplicate': False, 'matches': []})

        qs = Activity.objects.filter(
            college=request.user.college,
            faculty=request.user,
            title__iexact=title
        )
        if academic_year_id:
            qs = qs.filter(academic_year_id=academic_year_id)

        matches = []
        for m in qs[:5]:
            matches.append({
                'id': str(m.id),
                'title': m.title,
                'status': m.status,
                'created_at': m.created_at,
            })

        return Response({
            'is_duplicate': len(matches) > 0,
            'count': len(matches),
            'matches': matches,
            'warning': 'A submission with the same title already exists in your records.' if matches else None
        })


class DocumentViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = Document.objects.all().select_related('activity', 'uploaded_by')
    serializer_class = DocumentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return Document.objects.none()
        if user.role == 'FACULTY':
            return qs.filter(models.Q(uploaded_by=user) | models.Q(activity__faculty=user))
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            return qs.filter(department=user.department) if user.department_id else qs.none()
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        uploaded_file = self.request.FILES.get('file')

        file_hash = ''
        file_size = 0
        mime_type = 'application/octet-stream'

        if uploaded_file:
            from core.validators import validate_file_security
            validate_file_security(uploaded_file)

            # Check storage quota
            if user.college:
                from apps.colleges.services import UsageLimitService
                allowed, err_msg = UsageLimitService.check_storage_quota(user.college, uploaded_file.size)
                if not allowed:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError({'file': err_msg})

            # Compute SHA-256 hash
            hasher = hashlib.sha256()
            for chunk in uploaded_file.chunks():
                hasher.update(chunk)
            file_hash = hasher.hexdigest()
            uploaded_file.seek(0)
            file_size = uploaded_file.size
            mime_type = uploaded_file.content_type or mimetypes.guess_type(uploaded_file.name)[0] or 'application/octet-stream'

        doc = serializer.save(
            college=serializer.validated_data['activity'].college,
            department=serializer.validated_data['activity'].department,
            uploaded_by=user,
            file_hash=file_hash,
            file_size=file_size,
            mime_type=mime_type,
            original_filename=uploaded_file.name if uploaded_file else ''
        )

        if uploaded_file and user.college:
            from apps.colleges.services import UsageLimitService
            UsageLimitService.record_storage_change(user.college, file_size)

        log_action(
            actor=user,
            action='DOCUMENT_UPLOADED',
            instance=doc,
            request=self.request,
            comment=f'Uploaded certificate document "{doc.file_name}" for activity "{doc.activity.title}".'
        )

    def perform_destroy(self, instance):
        user = self.request.user
        if not instance.activity.is_editable or (user.role != 'SUPER_ADMIN' and
                (user.role != 'FACULTY' or instance.activity.faculty_id != user.id)):
            raise PermissionDenied('Only editable activity documents may be deleted by their author.')
        instance.delete()

    def _authenticate_request(self, request):
        if request.user and request.user.is_authenticated:
            return request.user
        token = request.query_params.get('token')
        if token:
            try:
                from rest_framework_simplejwt.authentication import JWTAuthentication
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(token)
                user = jwt_auth.get_user(validated_token)
                request.user = user
                return user
            except Exception:
                pass
        return request.user

    def _check_document_permission(self, doc, user):
        """Enforces tenant, department, and faculty document isolation."""
        if not user or not user.is_authenticated:
            raise PermissionDenied("Authentication required to access document.")
        if user.role == 'SUPER_ADMIN':
            return True
        if doc.college_id != user.college_id:
            raise PermissionDenied("Cross-tenant document access is strictly prohibited.")
        if user.role == 'FACULTY':
            if doc.activity.faculty_id != user.id and doc.uploaded_by_id != user.id:
                raise PermissionDenied("Faculty can only access their own documents.")
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            if doc.department_id != user.department_id and doc.activity.department_id != user.department_id:
                raise PermissionDenied("Department staff can only access documents from their own department.")
        return True

    @action(detail=True, methods=['get'], url_path='preview')
    def preview(self, request, pk=None):
        user = self._authenticate_request(request)
        doc = self.get_object()
        self._check_document_permission(doc, user)

        if not doc.file:
            raise Http404("Document file not found on disk.")

        try:
            return FileResponse(
                doc.file.open('rb'),
                content_type=doc.mime_type or 'application/pdf',
                as_attachment=False
            )
        except Exception as e:
            raise Http404(f"Error opening file: {str(e)}")

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        user = self._authenticate_request(request)
        doc = self.get_object()
        self._check_document_permission(doc, user)

        if not doc.file:
            raise Http404("Document file not found on disk.")

        try:
            filename = doc.original_filename or doc.file_name or 'certificate.pdf'
            return FileResponse(
                doc.file.open('rb'),
                content_type=doc.mime_type or 'application/octet-stream',
                as_attachment=True,
                filename=filename
            )
        except Exception as e:
            raise Http404(f"Error downloading file: {str(e)}")


class DocumentCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Configurable document categories (Certificate, Attendance, Report, Photos, etc.)"""
    queryset = DocumentCategory.objects.filter(is_active=True)
    serializer_class = DocumentCategorySerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return DocumentCategory.objects.none()
        return DocumentCategory.objects.filter(
            models.Q(college=user.college) | models.Q(college__isnull=True),
            is_active=True
        ).order_by('name')
