"""
Views & API Endpoints for External Integrations & Communication — Phase 16
"""
import os
import json
import logging
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.models import UserRole
from apps.integrations.models import (
    EmailTemplate,
    EmailDeliveryLog,
    Announcement,
    SSOConfiguration,
    CalendarSyncRecord,
    IncomingWebhookLog,
    StorageMigrationJob,
    EmailDeliveryStatus,
    AnnouncementAudience,
)
from apps.integrations.serializers import (
    EmailTemplateSerializer,
    EmailDeliveryLogSerializer,
    AnnouncementSerializer,
    SSOConfigurationSerializer,
    CalendarSyncRecordSerializer,
    IncomingWebhookLogSerializer,
    StorageMigrationJobSerializer,
)
from apps.integrations.services import (
    EmailService,
    CalendarService,
    StorageService,
    WebhookService,
    SSOService,
)
from apps.imports.models import APIKey, WebhookEndpoint, WebhookDeliveryLog
from apps.notifications.models import IQACTask
from apps.activities.models import Document
from apps.audit.utils import log_action

logger = logging.getLogger(__name__)


class IntegrationHealthView(APIView):
    """
    Returns live health & connectivity status of all institutional integrations.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        college = request.user.college
        if not college and request.user.role != UserRole.SUPER_ADMIN:
            raise PermissionDenied("Tenant college context required.")

        # 1. Email Health
        email_logs = EmailDeliveryLog.objects.filter(college=college)
        sent_emails = email_logs.filter(status=EmailDeliveryStatus.SENT).count()
        failed_emails = email_logs.filter(status=EmailDeliveryStatus.FAILED).count()
        email_status = "CONNECTED"
        if failed_emails > 0 and sent_emails == 0:
            email_status = "FAILED"
        elif failed_emails > 5:
            email_status = "WARNING"

        # 2. Webhook Health
        webhooks = WebhookEndpoint.objects.filter(college=college, is_active=True)
        webhook_logs = WebhookDeliveryLog.objects.filter(endpoint__college=college)
        wh_status = "CONNECTED" if webhooks.exists() else "DISCONNECTED"
        if webhook_logs.filter(status='FAILED').count() > 5:
            wh_status = "WARNING"

        # 3. Storage Health
        doc_count = Document.objects.filter(activity__college=college).count()
        storage_status = "CONNECTED"

        # 4. API Keys
        active_keys = APIKey.objects.filter(college=college, is_active=True).count()
        api_status = "CONNECTED" if active_keys > 0 else "DISCONNECTED"

        # 5. SSO Health
        sso_cfg = getattr(college, 'sso_config', None) if college else None
        sso_status = "ACTIVE" if (sso_cfg and sso_cfg.sso_enabled) else "INACTIVE"

        return Response({
            "college": college.name if college else "Platform",
            "services": {
                "email": {
                    "status": email_status,
                    "provider": "Mock Email Engine" if "mock" in str(type(EmailService.get_provider())).lower() else "SMTP",
                    "sent_count": sent_emails,
                    "failed_count": failed_emails,
                    "last_active": email_logs.first().created_at if email_logs.exists() else None,
                },
                "webhooks": {
                    "status": wh_status,
                    "active_endpoints": webhooks.count(),
                    "total_deliveries": webhook_logs.count(),
                    "failed_deliveries": webhook_logs.filter(status='FAILED').count(),
                },
                "storage": {
                    "status": storage_status,
                    "provider": "AWS S3 Vault" if "s3" in str(type(StorageService.get_provider())).lower() else "Local Filesystem Storage",
                    "total_evidence_documents": doc_count,
                    "signed_url_auth": True,
                },
                "api": {
                    "status": api_status,
                    "active_keys": active_keys,
                    "version": "v1",
                    "rate_limit": "100 req/min",
                },
                "calendar": {
                    "status": "CONNECTED",
                    "provider": "RFC 5545 iCalendar Provider",
                    "sync_mode": "On-Demand User Action",
                },
                "sso": {
                    "status": sso_status,
                    "provider": sso_cfg.provider_type if sso_cfg else "OIDC",
                    "allowed_domains": sso_cfg.allowed_domains if sso_cfg else [],
                },
            }
        })


class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    CRUD for college announcements with audience targeting and role-scoping.
    """
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        college = user.college
        if not college and user.role != UserRole.SUPER_ADMIN:
            return Announcement.objects.none()

        qs = Announcement.objects.filter(college=college)

        # Non-administrative users only see current, targeted announcements
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT, UserRole.IQAC]:
            today = timezone.now().date()
            qs = qs.filter(is_active=True, start_date__lte=today, end_date__gte=today)
            # Audience targeting filter
            targeted_ids = []
            for ann in qs:
                if ann.audience_type == AnnouncementAudience.ENTIRE_COLLEGE:
                    targeted_ids.append(ann.id)
                elif ann.audience_type == AnnouncementAudience.DEPARTMENT and ann.target_department == user.department:
                    targeted_ids.append(ann.id)
                elif ann.audience_type == AnnouncementAudience.ROLE and ann.target_role == user.role:
                    targeted_ids.append(ann.id)
            qs = qs.filter(id__in=targeted_ids)

        return qs.order_by('-start_date', '-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT, UserRole.IQAC]:
            raise PermissionDenied("Only IQAC, College Management, and Super Admin can publish announcements.")

        college = user.college
        ann = serializer.save(college=college, created_by=user)
        log_action(
            actor=user,
            action="ANNOUNCEMENT_CREATED",
            comment=f"Created announcement '{ann.title}' (Audience: {ann.audience_type})",
            college=college,
            instance=ann,
            request=self.request
        )


class EmailDeliveryLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lists email delivery audit logs with manual retry support.
    """
    serializer_class = EmailDeliveryLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT, UserRole.IQAC]:
            raise PermissionDenied("Only administrative roles can inspect email delivery logs.")
        return EmailDeliveryLog.objects.filter(college=user.college).order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='retry')
    def retry(self, request, pk=None):
        log = self.get_object()
        res = EmailService.retry_delivery(str(log.id))
        return Response({
            "success": res.success,
            "status": log.status,
            "message": res.message,
            "attempt_count": log.attempt_count
        })


class EmailTemplateViewSet(viewsets.ModelViewSet):
    """
    Configurable email templates with dynamic preview and test sending.
    """
    serializer_class = EmailTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT, UserRole.IQAC]:
            raise PermissionDenied("Only administrative roles can configure email templates.")
        college = user.college
        return EmailTemplate.objects.filter(college=college) | EmailTemplate.objects.filter(college__isnull=True)

    def perform_create(self, serializer):
        serializer.save(college=self.request.user.college)

    @action(detail=False, methods=['post'], url_path='test-send')
    def test_send(self, request):
        user = request.user
        recipient = request.data.get('recipient') or user.email
        event = request.data.get('event', 'SYSTEM_TEST')
        context = request.data.get('context', {'faculty_name': user.get_full_name()})

        res = EmailService.send_templated_email(
            college=user.college,
            recipient=recipient,
            event=event,
            context=context,
        )
        return Response({
            "success": res.success,
            "message": res.message,
            "recipient": recipient,
        })


class SSOConfigurationView(APIView):
    """
    Tenant SSO configuration management.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT, UserRole.IQAC]:
            raise PermissionDenied("Access restricted to institutional administrators.")

        cfg, _ = SSOConfiguration.objects.get_or_create(college=user.college)
        return Response(SSOConfigurationSerializer(cfg).data)

    def put(self, request):
        user = request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT]:
            raise PermissionDenied("Only College Management can modify SSO configurations.")

        cfg, _ = SSOConfiguration.objects.get_or_create(college=user.college)
        serializer = SSOConfigurationSerializer(cfg, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        log_action(
            actor=user,
            action="SSO_CONFIG_UPDATED",
            comment=f"SSO configuration updated (Enabled={cfg.sso_enabled}, Provider={cfg.provider_type})",
            college=user.college,
            instance=cfg,
            request=request
        )
        return Response(serializer.data)


class CalendarExportView(APIView):
    """
    Exports a task or milestone as an RFC 5545 .ics calendar file.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, task_id):
        college = request.user.college
        task = IQACTask.objects.filter(id=task_id, college=college).first()
        if not task:
            return Response({"error": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

        ics_content = CalendarService.generate_task_ics(task)
        response = HttpResponse(ics_content, content_type='text/calendar; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="task-{task.id}.ics"'
        return response


class StorageMigrationViewSet(viewsets.ModelViewSet):
    """
    Cloud storage migration jobs and triggers.
    """
    serializer_class = StorageMigrationJobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT, UserRole.IQAC]:
            raise PermissionDenied("Administrative permissions required.")
        return StorageMigrationJob.objects.filter(college=user.college).order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='start')
    def start_migration(self, request):
        user = request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT]:
            raise PermissionDenied("Only College Management or Super Admin can trigger cloud storage migration.")

        job = StorageService.run_storage_migration(user.college)
        return Response(StorageMigrationJobSerializer(job).data, status=status.HTTP_201_CREATED)


class IncomingWebhookView(APIView):
    """
    Secure reception of inbound webhooks from external college systems (SIS, ERP, LMS).
    Verifies HMAC signature, timestamp replay window, and records audit trail.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        signature = request.headers.get('X-IQAC-Signature', '')
        timestamp_str = request.headers.get('X-IQAC-Timestamp', '')
        source = request.data.get('source', 'EXTERNAL_ERP')
        event = request.data.get('event', 'UNKNOWN_EVENT')
        payload = request.data.get('data', {})

        # Secret verification (mock shared secret for incoming demo)
        shared_secret = "iqac_inbound_shared_secret_2026"

        is_valid, reason = WebhookService.process_incoming_webhook(
            source=source,
            event=event,
            payload=payload,
            signature=signature,
            timestamp_str=timestamp_str,
            secret=shared_secret,
        )

        if not is_valid:
            return Response({"error": reason}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"status": "SUCCESS", "message": "Inbound webhook accepted and logged."}, status=status.HTTP_200_OK)
