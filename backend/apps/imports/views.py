"""
Views & API Endpoints for Imports & Integrations (Phase 14)
"""
import io
import csv
import logging
from typing import Tuple, Optional, Any, Dict, List
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from django.core.files.base import ContentFile

from apps.accounts.models import UserRole, User, FacultyProfile
from apps.activities.models import Activity, ActivityStatus
from apps.evidence.models import Evidence
from apps.imports.models import (
    ImportJob,
    ImportTemplate,
    APIKey,
    WebhookEndpoint,
    WebhookDeliveryLog,
    ImportJobStatus,
    ImportDataType,
    ImportMode,
)
from apps.imports.serializers import (
    ImportJobSerializer,
    ImportTemplateSerializer,
    APIKeySerializer,
    WebhookEndpointSerializer,
    WebhookDeliveryLogSerializer,
)
from apps.imports.services.spreadsheet_parser import SpreadsheetParser
from apps.imports.services.validation_service import ImportValidationService
from apps.imports.services.import_executor import ImportExecutor
from apps.imports.services.template_service import TemplateService
from apps.imports.services.export_service import ExportService
from apps.imports.services.integration_service import APIKeyService, WebhookDispatcher

logger = logging.getLogger(__name__)


def get_default_mapping_suggestions(headers: list, data_type: str) -> dict:
    """
    Intelligently maps column header strings to system field names based on fuzzy keywords.
    """
    mapping = {}
    normalized_headers = {h: h.lower().replace(' ', '_').replace('-', '_') for h in headers}

    field_keywords = {
        'employee_id': ['emp_id', 'employee_id', 'empid', 'staff_id', 'faculty_id', 'id'],
        'first_name': ['first_name', 'fname', 'first', 'given_name'],
        'last_name': ['last_name', 'lname', 'surname', 'family_name'],
        'email': ['email', 'email_address', 'mail', 'faculty_email'],
        'phone': ['phone', 'mobile', 'contact', 'cell', 'phone_number'],
        'department': ['department', 'dept', 'branch', 'department_code'],
        'designation': ['designation', 'post', 'role', 'title_designation'],
        'qualification': ['qualification', 'degree', 'highest_degree', 'education'],
        'joining_date': ['joining_date', 'doj', 'date_of_joining', 'joined'],
        'title': ['title', 'activity_title', 'program_title', 'topic', 'event_name', 'name'],
        'faculty': ['faculty', 'faculty_email', 'faculty_id', 'staff_name', 'faculty_name'],
        'category': ['category', 'activity_type', 'type', 'event_type'],
        'academic_year': ['academic_year', 'year', 'ay', 'session'],
        'organizer': ['organizer', 'organized_by', 'conducted_by', 'host', 'agency'],
        'start_date': ['start_date', 'from_date', 'from', 'start', 'date'],
        'end_date': ['end_date', 'to_date', 'to', 'end'],
        'duration': ['duration', 'duration_days', 'days', 'hours'],
        'certificate_number': ['certificate_number', 'cert_no', 'certificate_id', 'ref_no'],
        'description': ['description', 'remarks', 'summary', 'details'],
        'document_filename': ['document_filename', 'filename', 'file_name', 'proof_file'],
        'code': ['code', 'dept_code', 'department_code', 'program_code'],
        'degree': ['degree', 'qualification_degree', 'program_degree'],
        'duration_years': ['duration_years', 'years', 'program_duration'],
    }

    for raw_h, norm_h in normalized_headers.items():
        for field, keywords in field_keywords.items():
            if norm_h in keywords or any(kw in norm_h for kw in keywords):
                mapping[raw_h] = field
                break

    return mapping


class ImportJobViewSet(viewsets.ModelViewSet):
    """
    CRUD and orchestration for spreadsheet import jobs.
    """
    serializer_class = ImportJobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ImportJob.objects.select_related('college', 'user')
        if user.role == UserRole.SUPER_ADMIN:
            return qs.all()
        return qs.filter(college=user.college)

    def create(self, request, *args, **kwargs):
        user = request.user
        college = user.college
        if not college and user.role != UserRole.SUPER_ADMIN:
            return Response({'error': 'No college tenant associated with user.'}, status=status.HTTP_400_BAD_REQUEST)

        # Permission check: Faculty cannot initiate bulk institutional imports
        if user.role == UserRole.FACULTY:
            return Response({'error': 'Faculty are not authorized to perform bulk institutional data imports.'}, status=status.HTTP_403_FORBIDDEN)

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'Spreadsheet file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        data_type = request.data.get('data_type', ImportDataType.FACULTY)
        mode = request.data.get('mode', ImportMode.INSERT_ONLY)

        # Validate file
        try:
            file_format = SpreadsheetParser.validate_file(file_obj)
            parsed_meta = SpreadsheetParser.parse(file_obj, file_format=file_format, max_rows=10)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-suggest column mappings
        suggestions = get_default_mapping_suggestions(parsed_meta['headers'], data_type)

        job = ImportJob.objects.create(
            college=college,
            user=user,
            data_type=data_type,
            file=file_obj,
            original_filename=file_obj.name,
            file_format=file_format,
            mode=mode,
            status=ImportJobStatus.UPLOADED,
            column_mapping=suggestions,
            total_rows=parsed_meta['total_rows'],
            validation_results={
                'headers': parsed_meta['headers'],
                'sheet_names': parsed_meta['sheet_names'],
                'sample_rows': parsed_meta['rows'][:5],
            }
        )

        serializer = self.get_serializer(job)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='map')
    def map_columns(self, request, pk=None):
        job = self.get_object()
        column_mapping = request.data.get('column_mapping', {})
        reference_mapping = request.data.get('reference_mapping', {})
        mode = request.data.get('mode')

        if column_mapping:
            job.column_mapping = column_mapping
        if reference_mapping:
            job.reference_mapping = reference_mapping
        if mode:
            job.mode = mode

        job.save()
        return Response({'message': 'Mapping updated successfully.', 'column_mapping': job.column_mapping, 'reference_mapping': job.reference_mapping})

    @action(detail=True, methods=['post'], url_path='validate')
    def validate_job(self, request, pk=None):
        job = self.get_object()
        job.status = ImportJobStatus.VALIDATING
        job.save(update_fields=['status'])

        try:
            parsed = SpreadsheetParser.parse(job.file, file_format=job.file_format)
            validator = ImportValidationService(job)
            results = validator.validate_rows(parsed['rows'])

            job.total_rows = results['total_rows']
            job.valid_rows = results['valid_rows']
            job.warning_count = results['warning_count']
            job.error_count = results['error_count']
            job.validation_results = results
            job.status = ImportJobStatus.READY if results['valid_rows'] > 0 else ImportJobStatus.COMPLETED_WITH_ERRORS
            job.save()

            return Response({
                'status': job.status,
                'total_rows': job.total_rows,
                'valid_rows': job.valid_rows,
                'warning_count': job.warning_count,
                'error_count': job.error_count,
                'duplicate_count': results.get('duplicate_count', 0),
                'preview': results['preview'],
                'error_details': results['error_details'],
            })
        except Exception as e:
            job.status = ImportJobStatus.FAILED
            job.save(update_fields=['status'])
            logger.error(f"Validation failed for job {job.id}: {e}")
            return Response({'error': f"Validation error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='execute')
    def execute_job(self, request, pk=None):
        job = self.get_object()
        if job.status not in (ImportJobStatus.READY, ImportJobStatus.COMPLETED_WITH_ERRORS):
            return Response({'error': 'Job must be validated before execution.'}, status=status.HTTP_400_BAD_REQUEST)

        # Allow user to switch mode right before execution
        chosen_mode = request.data.get('mode')
        if chosen_mode:
            job.mode = chosen_mode
            job.save(update_fields=['mode'])

        try:
            parsed = SpreadsheetParser.parse(job.file, file_format=job.file_format)
            executor = ImportExecutor(job)
            exec_res = executor.execute(parsed['rows'])

            return Response({
                'message': 'Import executed successfully.',
                'status': exec_res['status'],
                'imported_count': exec_res['imported_count'],
                'error_count': exec_res['error_count'],
                'errors': exec_res['errors'],
            })
        except Exception as e:
            logger.error(f"Execution failed for job {job.id}: {e}")
            return Response({'error': f"Execution error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='error-report')
    def error_report(self, request, pk=None):
        job = self.get_object()
        val_res = job.validation_results or {}
        error_details = val_res.get('error_details', [])

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(['Row Number', 'Field Name', 'Invalid Value', 'Error Description', 'Suggested Fix'])

        for item in error_details:
            writer.writerow([
                item.get('row', ''),
                item.get('field', ''),
                item.get('value', ''),
                item.get('error', ''),
                item.get('suggested_fix', ''),
            ])

        buffer.seek(0)
        resp = HttpResponse(buffer.getvalue(), content_type='text/csv')
        resp['Content-Disposition'] = f'attachment; filename="import_errors_{job.id}.csv"'
        return resp


class ImportTemplateViewSet(viewsets.ModelViewSet):
    """
    Saved column and reference mapping templates for repeated institutional formats.
    """
    serializer_class = ImportTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.SUPER_ADMIN:
            return ImportTemplate.objects.all()
        return ImportTemplate.objects.filter(college=user.college)

    def perform_create(self, serializer):
        serializer.save(
            college=self.request.user.college,
            created_by=self.request.user,
        )


class DownloadTemplateView(APIView):
    """
    Downloads standard import templates (.xlsx or .csv) for any data type.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, data_type):
        fmt = request.query_params.get('format', 'XLSX').upper()
        if fmt == 'CSV':
            buf = TemplateService.generate_csv_template(data_type)
            resp = HttpResponse(buf.getvalue(), content_type='text/csv')
            resp['Content-Disposition'] = f'attachment; filename="{data_type.lower()}_template.csv"'
            return resp
        else:
            buf = TemplateService.generate_excel_template(data_type)
            resp = HttpResponse(
                buf.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            resp['Content-Disposition'] = f'attachment; filename="{data_type.lower()}_template.xlsx"'
            return resp


class ControlledExportView(APIView):
    """
    Controlled dataset export enforcing strict role boundaries.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        data_type = request.data.get('data_type', 'ACTIVITIES').upper()
        fmt = request.data.get('format', 'XLSX').upper()
        filters = request.data.get('filters', {})

        try:
            file_bytes, content_type, filename = ExportService.export_data(
                user=user,
                data_type=data_type,
                export_format=fmt,
                filters=filters,
            )
            resp = HttpResponse(file_bytes, content_type=content_type)
            resp['Content-Disposition'] = f'attachment; filename="{filename}"'
            return resp
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Export error: {e}")
            return Response({'error': f"Failed to generate export: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class APIKeyViewSet(viewsets.ModelViewSet):
    """
    Tenant API key issuance and management.
    """
    serializer_class = APIKeySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role not in (UserRole.SUPER_ADMIN, UserRole.IQAC, UserRole.COLLEGE_MANAGEMENT):
            return APIKey.objects.none()
        if user.role == UserRole.SUPER_ADMIN:
            return APIKey.objects.all()
        return APIKey.objects.filter(college=user.college)

    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role not in (UserRole.SUPER_ADMIN, UserRole.IQAC):
            return Response({'error': 'Only IQAC and Super Admin can provision API keys.'}, status=status.HTTP_403_FORBIDDEN)

        college = user.college
        if not college and user.role == UserRole.SUPER_ADMIN:
            college_id = request.data.get('college')
            from apps.colleges.models import College
            college = College.objects.filter(id=college_id).first()

        name = request.data.get('name', 'External Integration')
        scopes = request.data.get('scopes', ['faculty:read', 'activities:read', 'evidence:read'])

        api_key, raw_token = APIKeyService.generate_api_key(
            college=college,
            name=name,
            scopes=scopes,
            user=user,
        )

        serializer = self.get_serializer(api_key)
        data = serializer.data
        data['raw_token'] = raw_token
        data['warning'] = 'Store this token securely now. It will NEVER be shown again.'
        return Response(data, status=status.HTTP_201_CREATED)


class WebhookViewSet(viewsets.ModelViewSet):
    """
    Webhook endpoints registration, testing, and delivery logs.
    """
    serializer_class = WebhookEndpointSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role not in (UserRole.SUPER_ADMIN, UserRole.IQAC, UserRole.COLLEGE_MANAGEMENT):
            return WebhookEndpoint.objects.none()
        if user.role == UserRole.SUPER_ADMIN:
            return WebhookEndpoint.objects.all()
        return WebhookEndpoint.objects.filter(college=user.college)

    def perform_create(self, serializer):
        serializer.save(
            college=self.request.user.college,
            created_by=self.request.user,
        )

    @action(detail=True, methods=['post'], url_path='test-ping')
    def test_ping(self, request, pk=None):
        ep = self.get_object()
        sample_payload = {
            'event': 'TEST_PING',
            'timestamp': timezone.now().isoformat(),
            'college': ep.college.name,
            'message': 'This is an automated test ping from IQAC Platform Integration Service.',
        }
        WebhookDispatcher._deliver_webhook(str(ep.id), 'TEST_PING', sample_payload)
        return Response({'message': f'Test event dispatched to {ep.url}. Check delivery logs.'})

    @action(detail=False, methods=['get'], url_path='logs')
    def delivery_logs(self, request):
        user = request.user
        qs = WebhookDeliveryLog.objects.select_related('endpoint')
        if user.role != UserRole.SUPER_ADMIN:
            qs = qs.filter(endpoint__college=user.college)
        serializer = WebhookDeliveryLogSerializer(qs.order_by('-created_at')[:100], many=True)
        return Response(serializer.data)


class AISuggestMappingView(APIView):
    """
    Suggests column mappings using heuristic and semantic header analysis.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        headers = request.data.get('headers', [])
        data_type = request.data.get('data_type', 'FACULTY')
        suggestions = get_default_mapping_suggestions(headers, data_type)
        return Response({'suggestions': suggestions})


import time
from django.core.cache import cache
from apps.criteria.models import Metric
from apps.reports.models import GeneratedReport
from apps.notifications.models import IQACTask
from apps.activities.models import ActivityCategory
from apps.audit.utils import log_action


class IntegrationV1APIView(APIView):
    """
    Authenticated external integration endpoint using X-IQAC-API-Key header.
    Phase 16: Granular scopes, rate limiting (100 req/min), audit logging, and expanded resources.
    """
    authentication_classes = []  # Bypass session auth
    permission_classes = []      # Custom API key auth

    def _authenticate(self, request) -> Tuple[Optional[APIKey], Optional[Any]]:
        auth_header = request.headers.get('X-IQAC-API-Key') or request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
        else:
            token = auth_header.strip()

        return APIKeyService.authenticate_token(token)

    def _check_rate_limit(self, key_id: str) -> Tuple[bool, int]:
        current_minute = int(time.time() // 60)
        cache_key = f"api_rate_limit_{key_id}_{current_minute}"
        count = cache.get(cache_key, 0)
        if count >= 100:
            return False, 0
        cache.set(cache_key, count + 1, timeout=65)
        return True, max(0, 100 - (count + 1))

    def get(self, request, resource):
        auth_res = self._authenticate(request)
        if not auth_res:
            return Response({'error': 'Unauthorized or invalid API key.'}, status=status.HTTP_401_UNAUTHORIZED)

        api_key, college = auth_res

        # Rate Limit Check
        is_allowed, remaining = self._check_rate_limit(str(api_key.id))
        headers = {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': str(remaining),
        }
        if not is_allowed:
            resp = Response({'error': 'Rate limit exceeded (100 requests/minute).'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            resp['X-RateLimit-Limit'] = '100'
            resp['X-RateLimit-Remaining'] = '0'
            return resp

        # Audit Log
        log_action(
            actor=api_key.created_by,
            action="EXTERNAL_API_READ",
            comment=f"External API read resource '{resource}' via {api_key.key_prefix}",
            college=college,
            request=request
        )

        if resource == 'faculty':
            if 'faculty:read' not in api_key.scopes:
                return Response({'error': 'Missing scope faculty:read'}, status=status.HTTP_403_FORBIDDEN, headers=headers)
            profiles = FacultyProfile.objects.filter(college=college).select_related('user', 'department')[:100]
            data = [{
                'employee_id': p.employee_id,
                'name': p.user.get_full_name(),
                'email': p.user.email,
                'department': p.department.code if p.department else None,
                'designation': p.designation,
                'status': p.status,
            } for p in profiles]
            return Response({'count': len(data), 'results': data}, headers=headers)

        elif resource == 'activities':
            if 'activities:read' not in api_key.scopes and 'activity:read' not in api_key.scopes:
                return Response({'error': 'Missing scope activities:read'}, status=status.HTTP_403_FORBIDDEN, headers=headers)
            activities = Activity.objects.filter(college=college).select_related('faculty', 'department')[:100]
            data = [{
                'id': str(a.id),
                'title': a.title,
                'faculty': a.faculty.get_full_name(),
                'department': a.department.code if a.department else None,
                'status': a.status,
                'is_verified': a.is_verified,
            } for a in activities]
            return Response({'count': len(data), 'results': data}, headers=headers)

        elif resource == 'evidence':
            if 'evidence:read' not in api_key.scopes:
                return Response({'error': 'Missing scope evidence:read'}, status=status.HTTP_403_FORBIDDEN, headers=headers)
            evidence = Evidence.objects.filter(college=college)[:100]
            data = [{
                'id': str(e.id),
                'title': e.title,
                'category': e.category,
                'verified_at': e.verified_at,
                'status': e.status,
            } for e in evidence]
            return Response({'count': len(data), 'results': data}, headers=headers)

        elif resource == 'metrics':
            if 'metric:read' not in api_key.scopes and 'metrics:read' not in api_key.scopes:
                return Response({'error': 'Missing scope metric:read'}, status=status.HTTP_403_FORBIDDEN, headers=headers)
            metrics = Metric.objects.filter(college=college).select_related('criterion')[:100]
            data = [{
                'id': str(m.id),
                'number': m.number,
                'title': m.title,
                'criterion': m.criterion.number if m.criterion else None,
            } for m in metrics]
            return Response({'count': len(data), 'results': data}, headers=headers)

        elif resource == 'reports':
            if 'report:read' not in api_key.scopes and 'reports:read' not in api_key.scopes:
                return Response({'error': 'Missing scope report:read'}, status=status.HTTP_403_FORBIDDEN, headers=headers)
            reports = GeneratedReport.objects.filter(college=college).select_related('report_type')[:100]
            data = [{
                'id': str(r.id),
                'title': r.title,
                'report_type': r.report_type.name if r.report_type else None,
                'status': r.status,
                'created_at': r.created_at,
            } for r in reports]
            return Response({'count': len(data), 'results': data}, headers=headers)

        elif resource == 'tasks':
            if 'task:read' not in api_key.scopes and 'tasks:read' not in api_key.scopes:
                return Response({'error': 'Missing scope task:read'}, status=status.HTTP_403_FORBIDDEN, headers=headers)
            tasks = IQACTask.objects.filter(college=college).select_related('owner')[:100]
            data = [{
                'id': str(t.id),
                'title': t.title,
                'priority': t.priority,
                'status': t.status,
                'due_date': str(t.due_date) if t.due_date else None,
                'owner': t.owner.email if t.owner else None,
            } for t in tasks]
            return Response({'count': len(data), 'results': data}, headers=headers)

        return Response({'error': f"Unknown resource '{resource}'"}, status=status.HTTP_404_NOT_FOUND, headers=headers)

    def post(self, request, resource):
        auth_res = self._authenticate(request)
        if not auth_res:
            return Response({'error': 'Unauthorized or invalid API key.'}, status=status.HTTP_401_UNAUTHORIZED)

        api_key, college = auth_res

        # Rate Limit Check
        is_allowed, remaining = self._check_rate_limit(str(api_key.id))
        headers = {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': str(remaining),
        }
        if not is_allowed:
            resp = Response({'error': 'Rate limit exceeded (100 requests/minute).'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            resp['X-RateLimit-Limit'] = '100'
            resp['X-RateLimit-Remaining'] = '0'
            return resp

        if resource == 'activities':
            if 'activity:write' not in api_key.scopes and 'activities:write' not in api_key.scopes:
                return Response({'error': 'Missing scope activity:write'}, status=status.HTTP_403_FORBIDDEN, headers=headers)

            title = request.data.get('title')
            faculty_email = request.data.get('faculty_email')
            if not title or not faculty_email:
                return Response({'error': 'title and faculty_email are required.'}, status=status.HTTP_400_BAD_REQUEST, headers=headers)

            faculty = User.objects.filter(college=college, email=faculty_email).first()
            if not faculty:
                return Response({'error': f"Faculty '{faculty_email}' not found in college."}, status=status.HTTP_404_NOT_FOUND, headers=headers)

            category = ActivityCategory.objects.filter(college=college).first()
            activity = Activity.objects.create(
                college=college,
                department=faculty.department,
                faculty=faculty,
                title=title,
                category=category,
                status=ActivityStatus.DRAFT,  # External API cannot create pre-verified activities!
                source='API',
                is_verified=False,
            )

            log_action(
                actor=api_key.created_by,
                action="EXTERNAL_API_ACTIVITY_CREATED",
                comment=f"Created DRAFT activity '{title}' via API key {api_key.key_prefix}",
                college=college,
                instance=activity,
                request=request
            )

            return Response({
                'id': str(activity.id),
                'title': activity.title,
                'status': activity.status,
                'is_verified': activity.is_verified,
                'message': 'Activity created in DRAFT status. Verification pipeline must be followed.',
            }, status=status.HTTP_201_CREATED, headers=headers)

        elif resource == 'tasks':
            if 'task:write' not in api_key.scopes and 'tasks:write' not in api_key.scopes:
                return Response({'error': 'Missing scope task:write'}, status=status.HTTP_403_FORBIDDEN, headers=headers)

            title = request.data.get('title')
            owner_email = request.data.get('owner_email')
            if not title or not owner_email:
                return Response({'error': 'title and owner_email are required.'}, status=status.HTTP_400_BAD_REQUEST, headers=headers)

            owner = User.objects.filter(college=college, email=owner_email).first()
            if not owner:
                return Response({'error': f"User '{owner_email}' not found in college."}, status=status.HTTP_404_NOT_FOUND, headers=headers)

            task = IQACTask.objects.create(
                college=college,
                creator=api_key.created_by or owner,
                owner=owner,
                department=owner.department,
                title=title,
                description=request.data.get('description', ''),
                priority=request.data.get('priority', 'NORMAL'),
                due_date=request.data.get('due_date'),
            )

            log_action(
                actor=api_key.created_by,
                action="EXTERNAL_API_TASK_CREATED",
                comment=f"Created Task '{title}' via API key {api_key.key_prefix}",
                college=college,
                instance=task,
                request=request
            )

            return Response({
                'id': str(task.id),
                'title': task.title,
                'priority': task.priority,
                'status': task.status,
                'owner': task.owner.email,
            }, status=status.HTTP_201_CREATED, headers=headers)

        return Response({'error': f"Write operation not supported for resource '{resource}'"}, status=status.HTTP_404_NOT_FOUND, headers=headers)
