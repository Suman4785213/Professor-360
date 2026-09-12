"""
Phase 18 — Advanced Admin & Support Test Suite
Tests Tenant Isolation, Support Tickets, SLAs, Internal Notes, Attachments,
System Health (zero secrets), Job Monitoring & Safe Retry, Security Events,
Maintenance Mode, and Tenant Export Isolation.
"""
from datetime import timedelta
from django.utils import timezone
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, RoleChoices
from apps.colleges.models import College, Plan, Subscription, SubscriptionStatus
from apps.support.models import (
    SupportTicket,
    TicketComment,
    TicketAttachment,
    SupportTicketCategory,
    SupportTicketPriority,
    SupportTicketStatus,
    SLAStatus,
    Incident,
    SecurityEvent,
    SecurityEventType,
    SecurityEventSeverity,
    SystemMaintenanceSetting,
)
from apps.support.services import (
    SupportTicketService,
    JobMonitoringService,
    SecurityEventService,
    MaintenanceModeService,
)
from apps.colleges.services import SystemHealthService, TenantExportService


class Phase18SupportAndAdminTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Super Admin
        self.super_admin = User.objects.create_user(
            email='superadmin@phase18.test',
            password='password123',
            first_name='Super',
            last_name='Admin',
            role=RoleChoices.SUPER_ADMIN,
        )

        # 2. College A (Apex Institute)
        self.college_a = College.objects.create(
            name='Apex Institute',
            code='APEX18',
            status='ACTIVE'
        )
        self.user_a = User.objects.create_user(
            email='iqac@apex.test',
            password='password123',
            first_name='Apex',
            last_name='IQAC',
            role=RoleChoices.IQAC,
            college=self.college_a
        )

        # 3. College B (Beacon University)
        self.college_b = College.objects.create(
            name='Beacon University',
            code='BEACON18',
            status='ACTIVE'
        )
        self.user_b = User.objects.create_user(
            email='iqac@beacon.test',
            password='password123',
            first_name='Beacon',
            last_name='IQAC',
            role=RoleChoices.IQAC,
            college=self.college_b
        )

    def test_support_ticket_creation_and_sla(self):
        """Verify ticket creation with automatic SLA computation and notifications."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post('/api/v1/tickets/', {
            'category': SupportTicketCategory.BUG,
            'priority': SupportTicketPriority.HIGH,
            'subject': 'Report export issue on Criterion 3',
            'description': 'Exporting criterion 3 fails with timeout on large datasets.'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data
        self.assertTrue(data['ticket_number'].startswith('TCK-'))
        self.assertEqual(data['priority'], SupportTicketPriority.HIGH)
        self.assertEqual(data['sla_status'], SLAStatus.ON_TIME)
        self.assertEqual(data['college'], self.college_a.id)

    def test_tenant_isolation_for_tickets(self):
        """Verify Tenant A cannot see Tenant B tickets, and Super Admin sees all."""
        # Create ticket for College A
        ticket_a = SupportTicketService.create_ticket(
            college=self.college_a,
            created_by=self.user_a,
            category=SupportTicketCategory.DATA,
            priority=SupportTicketPriority.MEDIUM,
            subject='Tenant A Private Issue',
            description='Private data issue for College A.'
        )

        # Create ticket for College B
        ticket_b = SupportTicketService.create_ticket(
            college=self.college_b,
            created_by=self.user_b,
            category=SupportTicketCategory.BILLING,
            priority=SupportTicketPriority.LOW,
            subject='Tenant B Billing Question',
            description='Billing question for College B.'
        )

        # 1. User A (College A) views tickets -> sees ONLY Ticket A
        self.client.force_authenticate(user=self.user_a)
        res_a = self.client.get('/api/v1/tickets/')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        ticket_ids_a = [t['id'] for t in res_a.data.get('results', res_a.data)]
        self.assertIn(str(ticket_a.id), ticket_ids_a)
        self.assertNotIn(str(ticket_b.id), ticket_ids_a)

        # Direct access to Ticket B by User A -> 404
        res_direct = self.client.get(f'/api/v1/tickets/{ticket_b.id}/')
        self.assertEqual(res_direct.status_code, status.HTTP_404_NOT_FOUND)

        # 2. User B (College B) views tickets -> sees ONLY Ticket B
        self.client.force_authenticate(user=self.user_b)
        res_b = self.client.get('/api/v1/tickets/')
        ticket_ids_b = [t['id'] for t in res_b.data.get('results', res_b.data)]
        self.assertIn(str(ticket_b.id), ticket_ids_b)
        self.assertNotIn(str(ticket_a.id), ticket_ids_b)

        # 3. Super Admin sees both
        self.client.force_authenticate(user=self.super_admin)
        res_sa = self.client.get('/api/v1/tickets/')
        ticket_ids_sa = [t['id'] for t in res_sa.data.get('results', res_sa.data)]
        self.assertIn(str(ticket_a.id), ticket_ids_sa)
        self.assertIn(str(ticket_b.id), ticket_ids_sa)

    def test_internal_notes_hidden_from_regular_users(self):
        """Verify internal staff notes are visible to Super Admin but hidden from regular users."""
        ticket = SupportTicketService.create_ticket(
            college=self.college_a,
            created_by=self.user_a,
            category=SupportTicketCategory.LOGIN,
            priority=SupportTicketPriority.MEDIUM,
            subject='SSO Login Failure',
            description='User cannot login with Google SSO.'
        )

        # Super Admin posts public reply
        SupportTicketService.add_comment(
            ticket=ticket,
            author=self.super_admin,
            message='We are investigating your Google SSO configuration.',
            is_internal=False
        )

        # Super Admin posts private internal note
        SupportTicketService.add_comment(
            ticket=ticket,
            author=self.super_admin,
            message='Internal note: Certificate mismatch observed in IdP logs.',
            is_internal=True
        )

        # User A views ticket: should only see 1 public comment
        self.client.force_authenticate(user=self.user_a)
        res_user = self.client.get(f'/api/v1/tickets/{ticket.id}/')
        comments_user = res_user.data['comments']
        self.assertEqual(len(comments_user), 1)
        self.assertFalse(comments_user[0]['is_internal'])
        self.assertIn('investigating your Google SSO', comments_user[0]['message'])

        # Super Admin views ticket: sees both comments (2 total)
        self.client.force_authenticate(user=self.super_admin)
        res_sa = self.client.get(f'/api/v1/tickets/{ticket.id}/')
        comments_sa = res_sa.data['comments']
        self.assertEqual(len(comments_sa), 2)
        has_internal = any(c['is_internal'] for c in comments_sa)
        self.assertTrue(has_internal)

    def test_ticket_attachment_upload_and_security(self):
        """Verify attachments require validation and enforce tenant isolation."""
        ticket = SupportTicketService.create_ticket(
            college=self.college_a,
            created_by=self.user_a,
            category=SupportTicketCategory.EVIDENCE,
            priority=SupportTicketPriority.MEDIUM,
            subject='Corrupted upload preview',
            description='Preview of certificate shows blank page.'
        )

        # 1. Valid attachment upload by ticket owner
        self.client.force_authenticate(user=self.user_a)
        valid_file = SimpleUploadedFile("evidence_screen.png", b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR", content_type="image/png")
        res_upload = self.client.post(f'/api/v1/tickets/{ticket.id}/attachment/', {'file': valid_file}, format='multipart')
        self.assertEqual(res_upload.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_upload.data['file_name'], 'evidence_screen.png')

        # 2. Cross-tenant user B attempts to upload attachment to ticket A -> 404 or 403
        self.client.force_authenticate(user=self.user_b)
        dummy_file = SimpleUploadedFile("hack.png", b"\x89PNG\r\n\x1a\n", content_type="image/png")
        res_bad = self.client.post(f'/api/v1/tickets/{ticket.id}/attachment/', {'file': dummy_file}, format='multipart')
        self.assertIn(res_bad.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    def test_sla_breach_calculation(self):
        """Verify SLA computation marks ticket as BREACHED when past due."""
        past_time = timezone.now() - timedelta(hours=30)
        ticket = SupportTicketService.create_ticket(
            college=self.college_a,
            created_by=self.user_a,
            category=SupportTicketCategory.BUG,
            priority=SupportTicketPriority.CRITICAL,
            subject='Urgent system downtime',
            description='System is not responding.'
        )

        # Force due dates into the past to simulate overdue SLA
        ticket.first_response_due_at = past_time
        ticket.resolution_due_at = past_time
        ticket.save()

        sla = ticket.calculate_sla_status()
        self.assertEqual(sla, SLAStatus.BREACHED)

    def test_system_health_endpoint_zero_secrets(self):
        """Verify /admin/system-health returns all 9 services without exposing secrets."""
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get('/api/v1/admin/system-health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertIn('overall_status', data)
        self.assertIn('services', data)
        services = data['services']

        required_services = [
            'backend', 'postgresql', 'redis', 'worker',
            'storage', 'ai', 'email', 'payment', 'webhooks'
        ]
        for s in required_services:
            self.assertIn(s, services, f"Service {s} missing from system health telemetry.")
            self.assertIn(services[s]['status'], ['HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN'])

        # Security check: ensure no passwords, keys, or tokens in serialized output
        dump_str = str(data).lower()
        self.assertNotIn('password', dump_str)
        self.assertNotIn('secret_key', dump_str)
        self.assertNotIn('api_key', dump_str)

    def test_job_monitoring_and_safe_retry(self):
        """Verify background job listing and safe retry execution."""
        from apps.reports.models import GeneratedReport, ReportType

        # Create sample failed report job
        rep_type, _ = ReportType.objects.get_or_create(
            name='AQAR Annual Summary',
            defaults={'code': 'AQAR_SUMMARY'}
        )
        report = GeneratedReport.objects.create(
            college=self.college_a,
            report_type=rep_type,
            title='Annual Report 2026',
            output_format='PDF',
            status='FAILED',
        )

        # Super Admin lists jobs
        self.client.force_authenticate(user=self.super_admin)
        res_jobs = self.client.get('/api/v1/admin/jobs/')
        self.assertEqual(res_jobs.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res_jobs.data['count'], 1)

        # Retry the failed report job
        res_retry = self.client.post('/api/v1/admin/jobs/retry/', {
            'job_type': 'REPORTS',
            'job_id': str(report.id)
        }, format='json')

        self.assertEqual(res_retry.status_code, status.HTTP_200_OK)
        self.assertTrue(res_retry.data['success'])

        report.refresh_from_db()
        self.assertEqual(report.status, 'PENDING')

    def test_security_event_logging(self):
        """Verify SecurityEventService logs security violations cleanly."""
        event = SecurityEventService.log_event(
            event_type=SecurityEventType.CROSS_TENANT_ACCESS,
            severity=SecurityEventSeverity.HIGH,
            college=self.college_a,
            user=self.user_b,
            user_email=self.user_b.email,
            ip_address='127.0.0.1',
            path='/api/v1/colleges/123/export/',
            details={'attempted_tenant': str(self.college_a.id)}
        )

        self.assertEqual(event.event_type, SecurityEventType.CROSS_TENANT_ACCESS)
        self.assertEqual(event.severity, SecurityEventSeverity.HIGH)
        self.assertEqual(event.user_email, self.user_b.email)

        # Super Admin queries security events
        self.client.force_authenticate(user=self.super_admin)
        res = self.client.get('/api/v1/security/events/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        event_ids = [e['id'] for e in res.data.get('results', res.data)]
        self.assertIn(str(event.id), event_ids)

    def test_maintenance_mode_activation_and_bypass(self):
        """Verify maintenance mode blocks non-admins (503) while Super Admin bypasses."""
        try:
            # Activate maintenance mode
            MaintenanceModeService.set_maintenance_mode(
                enabled=True,
                user=self.super_admin,
                reason='Phase 18 platform upgrade.'
            )
            self.assertTrue(MaintenanceModeService.is_enabled())

            # Regular user request is blocked with 503
            self.client.force_authenticate(user=self.user_a)
            res_user = self.client.get('/api/v1/auth/users/')
            self.assertEqual(res_user.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
            self.assertEqual(res_user.json()['error']['code'], 'MAINTENANCE_MODE')

            # Super Admin bypasses maintenance mode
            self.client.force_authenticate(user=self.super_admin)
            res_admin = self.client.get('/api/v1/auth/users/')
            self.assertEqual(res_admin.status_code, status.HTTP_200_OK)

        finally:
            # Restore normal mode
            MaintenanceModeService.set_maintenance_mode(
                enabled=False,
                user=self.super_admin
            )
            self.assertFalse(MaintenanceModeService.is_enabled())

    def test_strict_tenant_export_isolation(self):
        """CRITICAL: Tenant A must NEVER be able to export Tenant B data."""
        # 1. User A tries to export College B -> blocked (403 Forbidden or 404 IDOR isolation)
        self.client.force_authenticate(user=self.user_a)
        res_cross = self.client.get(f'/api/v1/colleges/{self.college_b.id}/export/')
        self.assertIn(res_cross.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # 2. User A exports College A -> 200 OK
        res_own = self.client.get(f'/api/v1/colleges/{self.college_a.id}/export/')
        self.assertEqual(res_own.status_code, status.HTTP_200_OK)
        data_a = res_own.json()
        self.assertEqual(data_a['college']['code'], self.college_a.code)

        # 3. Super Admin can export College B -> 200 OK
        self.client.force_authenticate(user=self.super_admin)
        res_sa = self.client.get(f'/api/v1/colleges/{self.college_b.id}/export/')
        self.assertEqual(res_sa.status_code, status.HTTP_200_OK)
        data_b = res_sa.json()
        self.assertEqual(data_b['college']['code'], self.college_b.code)

    def test_admin_search_permission_and_results(self):
        """Verify admin search returns indexed results across entities and blocks non-admins."""
        # Non-admin cannot search
        self.client.force_authenticate(user=self.user_a)
        res_forbidden = self.client.get('/api/v1/admin/search/?q=Apex')
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # Super Admin search
        self.client.force_authenticate(user=self.super_admin)
        res_ok = self.client.get('/api/v1/admin/search/?q=Apex')
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        results = res_ok.data
        self.assertIn('colleges', results)
        self.assertIn('users', results)
        self.assertTrue(any(c['name'] == self.college_a.name for c in results['colleges']))
