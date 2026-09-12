"""
Views for Reports app — Phase 6: Automated Report Generation Engine
Endpoints for Report Types, Custom Templates, Preview, Generation, History, and Secure Downloads.
"""
import mimetypes
from django.db import models
from django.db.models import Q
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.mixins import TenantMixin
from core.permissions import IsSuperAdminOrIQAC
from apps.audit.utils import log_action
from .models import ReportType, ReportTemplate, ReportTemplateVersion, GeneratedReport, ReportStatus
from .serializers import (
    ReportTypeSerializer,
    ReportTemplateSerializer,
    ReportTemplateVersionSerializer,
    GeneratedReportListSerializer,
    ReportFilterRequestSerializer,
    ReportGenerateRequestSerializer,
)
from .services import ReportDataService, ReportGenerationCoordinator


class ReportTypeViewSet(viewsets.ModelViewSet):
    """
    Configurable catalog of institutional report types (Section 2).
    """
    queryset = ReportType.objects.filter(is_active=True).order_by('display_order', 'name')
    serializer_class = ReportTypeSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSuperAdminOrIQAC()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ReportType.objects.none()
        if user.role == 'SUPER_ADMIN':
            return ReportType.objects.filter(is_active=True)
        return ReportType.objects.filter(
            Q(college__isnull=True) | Q(college=user.college),
            is_active=True
        ).order_by('display_order', 'name')


class ReportTemplateViewSet(TenantMixin, viewsets.ModelViewSet):
    """
    Template management with versioning, upload validation, and placeholder guide (Section 7, 10, 11).
    """
    queryset = ReportTemplate.objects.filter(is_active=True).order_by('-updated_at')
    serializer_class = ReportTemplateSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'placeholders', 'download']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSuperAdminOrIQAC()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ReportTemplate.objects.none()
        if user.role == 'SUPER_ADMIN':
            return ReportTemplate.objects.filter(is_active=True)
        return ReportTemplate.objects.filter(
            Q(college__isnull=True) | Q(college=user.college),
            is_active=True
        ).select_related('report_type', 'created_by').prefetch_related('versions')

    def perform_create(self, serializer):
        user = self.request.user
        college = user.college if user.role != 'SUPER_ADMIN' else None
        tpl = serializer.save(college=college, created_by=user, version=1)

        # Save initial version if file provided
        if tpl.file:
            ReportTemplateVersion.objects.create(
                template=tpl,
                version_number=1,
                file=tpl.file,
                change_summary="Initial template upload",
                created_by=user
            )
        log_action(
            actor=user,
            action='TEMPLATE_UPLOADED',
            instance=tpl,
            comment=f"Created report template '{tpl.name}' for {tpl.report_type.name}"
        )

    @action(detail=True, methods=['post'], url_path='upload-version')
    def upload_version(self, request, pk=None):
        """
        Uploads a new version of an existing template (Section 11).
        Preserves past versions so historical reports remain reproducible.
        """
        template = self.get_object()
        file_obj = request.FILES.get('file')
        change_summary = request.data.get('change_summary', '')
        if not file_obj:
            raise ValidationError({'file': 'No template file uploaded.'})

        # Validate file format (Section 30)
        ext = file_obj.name.split('.')[-1].lower()
        if ext not in ['docx', 'xlsx', 'pdf']:
            raise ValidationError({'file': 'Supported template file formats are .docx, .xlsx, .pdf.'})

        user = request.user
        new_version_num = template.version + 1
        template.file = file_obj
        template.version = new_version_num
        template.save()

        ver = ReportTemplateVersion.objects.create(
            template=template,
            version_number=new_version_num,
            file=file_obj,
            change_summary=change_summary or f"Updated to version {new_version_num}",
            created_by=user
        )

        log_action(
            actor=user,
            action='TEMPLATE_VERSION_UPDATED',
            instance=template,
            comment=f"Uploaded version {new_version_num} for '{template.name}'"
        )

        return Response(ReportTemplateSerializer(template).data)

    @action(detail=False, methods=['get'])
    def placeholders(self, request):
        """
        Returns supported placeholders for custom template authoring (Section 8 & 31).
        """
        return Response([
            {"token": "{{college_name}}", "label": "College Name", "category": "Institution", "description": "Full accredited name of the institution"},
            {"token": "{{report_title}}", "label": "Report Title", "category": "Report Meta", "description": "Auto-generated report title with department and cycle"},
            {"token": "{{academic_year}}", "label": "Academic Year", "category": "Scope", "description": "Selected academic cycle (e.g. 2025-26)"},
            {"token": "{{department_name}}", "label": "Department Name", "category": "Scope", "description": "Name of contributing department or college scope"},
            {"token": "{{generated_by}}", "label": "Generated By", "category": "Audit", "description": "Name of the authorized IQAC officer or faculty"},
            {"token": "{{generated_date}}", "label": "Generated Date", "category": "Audit", "description": "Current date of report generation"},
            {"token": "{{total_records}}", "label": "Total Records Count", "category": "Report Meta", "description": "Total number of verified institutional items in report"},
            {"token": "{{#activities}} ... {{/activities}}", "label": "Repeatable Activities Table Loop", "category": "Data Table", "description": "Wraps table rows to repeat for every verified activity in dataset"},
            {"token": "{{sl_no}}", "label": "Serial Number", "category": "Activity Field", "description": "Row sequence index (1, 2, 3...)"},
            {"token": "{{faculty_name}}", "label": "Faculty Member", "category": "Activity Field", "description": "Full name of the faculty participant"},
            {"token": "{{employee_id}}", "label": "Employee ID", "category": "Activity Field", "description": "Institutional faculty employee code"},
            {"token": "{{activity_title}}", "label": "Activity / Certificate Title", "category": "Activity Field", "description": "Title of verified activity"},
            {"token": "{{activity_category}}", "label": "Activity Category", "category": "Activity Field", "description": "Category name (FDP, Workshop, Publication, etc.)"},
            {"token": "{{date}}", "label": "Activity Date Range", "category": "Activity Field", "description": "Formatted date span or single event date"},
            {"token": "{{duration}}", "label": "Duration", "category": "Activity Field", "description": "Duration in days or hours"},
            {"token": "{{organizer}}", "label": "Host / Organizer", "category": "Activity Field", "description": "Organizing university, body, or industry partner"},
        ])


class ReportViewSet(TenantMixin, viewsets.GenericViewSet):
    """
    Core Report Engine ViewSet:
    Preview, Generate, History, and Secure Download APIs (Section 3, 6, 18, 21).
    """
    queryset = GeneratedReport.objects.filter(status__in=[ReportStatus.COMPLETED, ReportStatus.GENERATING])
    serializer_class = GeneratedReportListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return GeneratedReport.objects.none()

        qs = GeneratedReport.objects.exclude(status=ReportStatus.ARCHIVED).select_related(
            'report_type', 'template', 'academic_year', 'department', 'generated_by'
        )

        if user.role != 'SUPER_ADMIN':
            qs = qs.filter(college=user.college)

        # Role-based access control (Sections 21-25)
        if user.role == 'FACULTY':
            qs = qs.filter(faculty=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            if user.department:
                qs = qs.filter(Q(department=user.department) | Q(department__isnull=True))
            else:
                qs = qs.none()

        # Academic year filtering
        ay_id = self.request.query_params.get('academic_year')
        if ay_id:
            qs = qs.filter(academic_year_id=ay_id)

        # Department filtering
        dept_id = self.request.query_params.get('department')
        if dept_id:
            qs = qs.filter(department_id=dept_id)

        # Format filtering
        fmt = self.request.query_params.get('format')
        if fmt:
            qs = qs.filter(output_format=fmt.upper())

        return qs.order_by('-generated_at')

    @action(detail=False, methods=['post'])
    def preview(self, request):
        """
        Pre-generation inspection: returns report title, record count, and paginated table preview (Section 6).
        Does NOT generate files or modify source data.
        """
        serializer = ReportFilterRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        filters = serializer.validated_data

        try:
            report_type = ReportType.objects.get(id=filters['report_type'])
        except ReportType.DoesNotExist:
            raise ValidationError({'report_type': 'Report type not found.'})

        # Fetch and normalize data
        report_data = ReportDataService.get_scoped_data(request.user, filters, report_type)

        # Return preview metadata + first 30 records for table preview
        return Response({
            'title': report_data['meta']['title'],
            'report_type_code': report_data['meta']['report_type_code'],
            'report_type_name': report_data['meta']['report_type_name'],
            'academic_year': report_data['meta']['academic_year'],
            'department': report_data['meta']['department'],
            'total_records': report_data['meta']['total_records'],
            'filters_applied': filters,
            'records_preview': report_data['records'][:30],
            'sample_records': report_data['records'][:30],
            'meta': report_data['meta'],
            'college': report_data['college'],
        })

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """
        Generates official PDF, Excel, or Word report and saves it to history (Section 4, 15).
        """
        serializer = ReportGenerateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            report_type = ReportType.objects.get(id=data['report_type'])
        except ReportType.DoesNotExist:
            raise ValidationError({'report_type': 'Report type not found.'})

        template = None
        tpl_id = data.get('template')
        if tpl_id:
            try:
                template = ReportTemplate.objects.get(id=tpl_id, is_active=True)
            except ReportTemplate.DoesNotExist:
                raise ValidationError({'template': 'Selected report template not found.'})

        output_format = data.get('output_format') or (template.file_format if template else report_type.default_format)

        # Check report generation quota
        if request.user.college:
            from apps.colleges.services import UsageLimitService
            allowed, msg = UsageLimitService.check_report_quota(request.user.college)
            if not allowed:
                return Response({'error': msg}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Generate report
        report_record = ReportGenerationCoordinator.generate_report(
            user=request.user,
            report_type=report_type,
            filters=data,
            output_format=output_format,
            template=template
        )

        if request.user.college:
            from apps.colleges.services import UsageLimitService
            UsageLimitService.record_report_job(request.user.college)

        return Response(
            GeneratedReportListSerializer(report_record).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'])
    def history(self, request):
        """
        Lists previously generated historical reports with role-based filtering (Section 18).
        """
        qs = self.get_queryset()
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Secure authenticated file download checking role permissions (Section 21).
        """
        user = request.user
        college = user.college if user.role != 'SUPER_ADMIN' else getattr(user, 'selected_college', user.college)
        report_qs = GeneratedReport.objects.all()
        if college:
            report_qs = report_qs.filter(college=college)
        report = report_qs.filter(pk=pk).first()
        if not report:
            raise Http404("Report not found.")

        if not report.file or not report.file.storage.exists(report.file.name):
            raise Http404("Report file does not exist or has been removed.")
        # Strict permission check: Faculty only own, HOD only assigned department
        if user.role == 'FACULTY' and report.faculty_id != user.id:
            raise PermissionDenied("You are not authorized to download this report.")
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            if report.department_id and report.department_id != user.department_id:
                raise PermissionDenied("You can only download reports for your assigned department.")

        # Log download audit event
        log_action(
            actor=user,
            action='REPORT_DOWNLOADED',
            instance=report,
            comment=f"Downloaded report '{report.title}' [{report.output_format}]"
        )

        mime_type, _ = mimetypes.guess_type(report.file.name)
        mime_type = mime_type or 'application/octet-stream'

        response = FileResponse(report.file.open('rb'), content_type=mime_type)
        filename = report.file.name.split('/')[-1]
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """
        Soft-archives a generated report without permanent data loss (Section 18).
        """
        report = self.get_object()
        user = request.user
        if user.role not in ['SUPER_ADMIN', 'IQAC']:
            raise PermissionDenied("Only IQAC and Super Admin officers can archive generated reports.")

        reason = request.data.get('reason', 'Archived by IQAC officer')
        report.status = ReportStatus.ARCHIVED
        report.archived_at = timezone.now()
        report.archived_by = user
        report.archive_reason = reason
        report.save()

        log_action(
            actor=user,
            action='REPORT_ARCHIVED',
            instance=report,
            comment=f"Archived report '{report.title}' (Reason: {reason})"
        )

        return Response({'status': 'Report archived successfully', 'id': str(report.id)})
