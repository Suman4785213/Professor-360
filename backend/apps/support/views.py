"""
Views for Support & Operations — Phase 18
Implements SupportTicketViewSet, IncidentViewSet, KnowledgeBase ViewSets,
SecurityEventViewSet, BackgroundJobViewSet, AdminSearchView, MaintenanceModeView,
and SystemHealthDetailView.
"""
import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from core.permissions import IsSuperAdmin
from core.validators import validate_file_security
from apps.accounts.models import User, RoleChoices
from apps.colleges.models import College
from apps.colleges.services import SystemHealthService

from .models import (
    SupportTicket,
    TicketComment,
    TicketAttachment,
    Incident,
    KnowledgeBaseCategory,
    KnowledgeBaseArticle,
    SecurityEvent,
    SystemMaintenanceSetting,
    SupportTicketStatus,
)
from .serializers import (
    SupportTicketSerializer,
    SupportTicketCreateSerializer,
    TicketCommentSerializer,
    TicketAttachmentSerializer,
    IncidentSerializer,
    KnowledgeBaseCategorySerializer,
    KnowledgeBaseArticleSerializer,
    SecurityEventSerializer,
    SystemMaintenanceSerializer,
)
from .services import (
    SupportTicketService,
    JobMonitoringService,
    SecurityEventService,
    AdminSearchService,
    MaintenanceModeService,
)

logger = logging.getLogger(__name__)


class SupportTicketViewSet(viewsets.ModelViewSet):
    """
    Support Ticket desk for both Tenants (/support) and Super Admins (/admin/support).
    Enforces strict multi-tenant scoping.
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'category', 'college', 'sla_status']
    search_fields = ['ticket_number', 'subject', 'description']
    ordering_fields = ['created_at', 'priority', 'status', 'sla_status']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return SupportTicket.objects.none()

        qs = SupportTicket.objects.select_related('college', 'created_by', 'assigned_to').prefetch_related('comments', 'attachments')

        if user.role == RoleChoices.SUPER_ADMIN:
            return qs

        # Tenant isolation: non-superadmin can ONLY see their college's tickets
        if user.college:
            return qs.filter(college=user.college)
        return SupportTicket.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return SupportTicketCreateSerializer
        return SupportTicketSerializer

    def create(self, request, *args, **kwargs):
        user = request.user
        college = user.college

        # Super Admin can specify a target college, else default to own or first
        if user.role == RoleChoices.SUPER_ADMIN:
            target_college_id = request.data.get('college_id') or request.data.get('college')
            if target_college_id:
                college = College.objects.filter(id=target_college_id).first()
            if not college:
                college = College.objects.filter(is_deleted=False).first()

        if not college:
            return Response({'error': 'No institutional college associated with user.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = SupportTicketCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ticket = SupportTicketService.create_ticket(
            college=college,
            created_by=user,
            category=serializer.validated_data['category'],
            priority=serializer.validated_data['priority'],
            subject=serializer.validated_data['subject'],
            description=serializer.validated_data['description'],
        )

        # Handle optional initial attachment
        if 'attachment' in request.FILES:
            file_obj = request.FILES['attachment']
            try:
                safe_name = validate_file_security(file_obj, max_size=20 * 1024 * 1024)
                TicketAttachment.objects.create(
                    ticket=ticket,
                    uploaded_by=user,
                    file=file_obj,
                    file_name=safe_name,
                    file_size=file_obj.size,
                    mime_type=getattr(file_obj, 'content_type', 'application/octet-stream')
                )
            except Exception as e:
                logger.error(f"Error attaching initial file to ticket {ticket.ticket_number}: {e}")

        response_serializer = SupportTicketSerializer(ticket, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='comment')
    def add_comment(self, request, pk=None):
        ticket = self.get_object()
        user = request.user
        message = request.data.get('message', '').strip()
        is_internal = bool(request.data.get('is_internal', False))

        if not message:
            return Response({'error': 'Message content is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            comment = SupportTicketService.add_comment(
                ticket=ticket,
                author=user,
                message=message,
                is_internal=is_internal
            )
            serializer = TicketCommentSerializer(comment, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except PermissionError as pe:
            return Response({'error': str(pe)}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=True, methods=['post'], url_path='attachment')
    def upload_attachment(self, request, pk=None):
        ticket = self.get_object()
        user = request.user

        # Non-superadmin must belong to ticket's college
        if user.role != RoleChoices.SUPER_ADMIN and user.college_id != ticket.college_id:
            return Response({'error': '403 Forbidden — Cross-tenant attachment upload blocked.'}, status=status.HTTP_403_FORBIDDEN)

        if 'file' not in request.FILES:
            return Response({'error': 'No file was provided.'}, status=status.HTTP_400_BAD_REQUEST)

        file_obj = request.FILES['file']
        try:
            safe_name = validate_file_security(file_obj, max_size=25 * 1024 * 1024)
            attachment = TicketAttachment.objects.create(
                ticket=ticket,
                uploaded_by=user,
                file=file_obj,
                file_name=safe_name,
                file_size=file_obj.size,
                mime_type=getattr(file_obj, 'content_type', 'application/octet-stream')
            )
            serializer = TicketAttachmentSerializer(attachment, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin], url_path='assign')
    def assign(self, request, pk=None):
        ticket = self.get_object()
        assignee_id = request.data.get('assigned_to')
        if not assignee_id:
            return Response({'error': 'assigned_to user ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        assignee = User.objects.filter(id=assignee_id).first()
        if not assignee:
            return Response({'error': 'Assignee user not found.'}, status=status.HTTP_404_NOT_FOUND)

        ticket = SupportTicketService.assign_ticket(ticket, request.user, assignee)
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        user = request.user

        if user.role != RoleChoices.SUPER_ADMIN and user != ticket.created_by:
            return Response({'error': 'Only Super Admins or ticket creator can mark ticket as resolved.'}, status=status.HTTP_403_FORBIDDEN)

        notes = request.data.get('resolution_notes', '')
        ticket = SupportTicketService.resolve_ticket(ticket, user, notes)
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin], url_path='waiting-for-user')
    def waiting_for_user(self, request, pk=None):
        ticket = self.get_object()
        ticket = SupportTicketService.set_waiting_for_user(ticket, request.user)
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='close')
    def close(self, request, pk=None):
        ticket = self.get_object()
        user = request.user
        if user.role != RoleChoices.SUPER_ADMIN and user != ticket.created_by:
            return Response({'error': '403 Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        ticket.status = SupportTicketStatus.CLOSED
        ticket.save(update_fields=['status', 'updated_at'])
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)


class IncidentViewSet(viewsets.ModelViewSet):
    """
    Incident management endpoint.
    All users can view active incidents; Super Admins manage incidents.
    """
    queryset = Incident.objects.all().prefetch_related('affected_tenants')
    serializer_class = IncidentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'severity']
    search_fields = ['title', 'description', 'resolution']
    ordering = ['-started_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsSuperAdmin()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if not user.is_authenticated:
            return Incident.objects.none()
        if user.role == RoleChoices.SUPER_ADMIN:
            return qs

        # Non-superadmin sees incidents affecting all tenants OR affecting their college
        if user.college:
            return qs.filter(Q(affects_all_tenants=True) | Q(affected_tenants=user.college)).distinct()
        return qs.filter(affects_all_tenants=True)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class KnowledgeBaseCategoryViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeBaseCategory.objects.all().prefetch_related('articles')
    serializer_class = KnowledgeBaseCategorySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsSuperAdmin()]


class KnowledgeBaseArticleViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeBaseArticle.objects.select_related('category').all()
    serializer_class = KnowledgeBaseArticleSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'status']
    search_fields = ['title', 'content', 'slug']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'view_article']:
            return [permissions.IsAuthenticated()]
        return [IsSuperAdmin()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_authenticated and user.role == RoleChoices.SUPER_ADMIN:
            return qs
        return qs.filter(status='PUBLISHED')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='view')
    def view_article(self, request, pk=None):
        article = self.get_object()
        article.view_count += 1
        article.save(update_fields=['view_count'])
        return Response({'success': True, 'view_count': article.view_count})


class SecurityEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Security Event log viewer.
    Restricted strictly to Super Admin.
    """
    queryset = SecurityEvent.objects.select_related('college', 'user').all()
    serializer_class = SecurityEventSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['event_type', 'severity', 'college', 'resolved']
    search_fields = ['user_email', 'path', 'ip_address']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve_event(self, request, pk=None):
        event = self.get_object()
        event.resolved = True
        event.save(update_fields=['resolved'])
        return Response({'success': True, 'resolved': True})


class BackgroundJobViewSet(viewsets.ViewSet):
    """
    Background job monitoring & telemetry console for Super Admin.
    """
    permission_classes = [IsSuperAdmin]

    def list(self, request):
        job_type = request.query_params.get('job_type')
        status_param = request.query_params.get('status')
        limit = int(request.query_params.get('limit', 100))

        jobs = JobMonitoringService.get_jobs(
            job_type=job_type,
            status=status_param,
            limit=limit
        )
        return Response({'jobs': jobs, 'count': len(jobs)})

    @action(detail=False, methods=['post'], url_path='retry')
    def retry_job(self, request):
        job_type = request.data.get('job_type')
        job_id = request.data.get('job_id')

        if not job_type or not job_id:
            return Response({'error': 'job_type and job_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = JobMonitoringService.retry_job(job_type, job_id, request.user)
            return Response(result)
        except (ValueError, PermissionError) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminSearchView(APIView):
    """
    Unified platform search across Colleges, Users, Tickets, Incidents, and Audits.
    Restricted to Super Admin.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        results = AdminSearchService.search(q, request.user)
        return Response(results)


class MaintenanceModeView(APIView):
    """
    Global maintenance mode management for Super Admin.
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [IsSuperAdmin()]

    def get(self, request):
        setting = SystemMaintenanceSetting.get_setting()
        serializer = SystemMaintenanceSerializer(setting)
        return Response(serializer.data)

    def post(self, request):
        enabled = request.data.get('enabled')
        if enabled is None:
            return Response({'error': 'enabled boolean is required.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', 'Scheduled maintenance.')
        duration = int(request.data.get('estimated_duration_minutes', 60))

        setting = MaintenanceModeService.set_maintenance_mode(
            enabled=bool(enabled),
            user=request.user,
            reason=reason,
            estimated_duration_minutes=duration
        )
        serializer = SystemMaintenanceSerializer(setting)
        return Response({
            'success': True,
            'message': f"Maintenance mode has been {'enabled' if enabled else 'disabled'}.",
            'setting': serializer.data
        })


class SystemHealthDetailView(APIView):
    """
    Comprehensive live system health telemetry for /admin/system-health.
    Adheres strictly to zero secrets exposure.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        telemetry = SystemHealthService.get_system_health()
        return Response(telemetry)
