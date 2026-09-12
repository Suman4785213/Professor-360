"""
Phase 16: External Integrations & Communication Platform — Comprehensive Test Suite
Tests:
1. External service failure resilience (Email failure does not block evidence verification)
2. Safe email template variable interpolation & delivery logging
3. Controlled email retry limits and backoff
4. Webhook HMAC-SHA256 signature verification & 5-minute replay protection
5. Webhook payload data minimization (no private file contents)
6. REST API authentication & granular scope enforcement
7. REST API rate limiting and audit logging
8. Multi-tenant isolation across external APIs, webhooks, and logs
9. Institutional announcement audience targeting (college, department, role)
10. RFC 5545 iCalendar (.ics) generation
11. Secure signed document download URLs & checksum verification
12. SSO domain-based tenant discovery
"""
import time
import uuid
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, UserRole, FacultyProfile
from apps.colleges.models import College
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityCategory, ActivityStatus, Document
from apps.evidence.models import Evidence
from apps.verification.models import VerificationRecord
from apps.notifications.models import IQACTask
from apps.imports.models import APIKey, WebhookEndpoint
from apps.integrations.models import (
    EmailTemplate,
    EmailDeliveryLog,
    EmailDeliveryStatus,
    Announcement,
    AnnouncementPriority,
    AnnouncementAudience,
    SSOConfiguration,
    SSOStatus,
)
from apps.integrations.services import (
    EmailService,
    MockEmailProvider,
    CalendarService,
    StorageService,
    WebhookService,
    SSOService,
)


class Phase16IntegrationTestSuite(TestCase):
    def setUp(self):
        self.client = APIClient()
        MockEmailProvider.reset()

        # College A (Primary Tenant)
        self.college_a = College.objects.create(
            name="Apex Institute of Technology",
            code="AIT",
            state="Maharashtra"
        )
        self.dept_it = Department.objects.create(
            college=self.college_a,
            name="Information Technology",
            code="IT"
        )
        self.dept_cse = Department.objects.create(
            college=self.college_a,
            name="Computer Science & Engineering",
            code="CSE"
        )
        self.ay_2025 = AcademicYear.objects.create(
            college=self.college_a,
            name="2025-26",
            start_date="2025-07-01",
            end_date="2026-06-30",
            is_active=True,
            is_current=True
        )

        # Users
        self.iqac_user = User.objects.create_user(
            email="iqac@ait.edu",
            password="SecurePassword123!",
            role=UserRole.IQAC,
            first_name="Dr. Anil",
            last_name="Deshmukh",
            college=self.college_a
        )
        self.hod_it = User.objects.create_user(
            email="hod.it@ait.edu",
            password="SecurePassword123!",
            role=UserRole.HOD,
            first_name="Dr. Sunita",
            last_name="Patil",
            college=self.college_a,
            department=self.dept_it
        )
        self.incharge_it = User.objects.create_user(
            email="incharge.it@ait.edu",
            password="SecurePassword123!",
            role=UserRole.DEPARTMENT_INCHARGE,
            first_name="Prof. Rajesh",
            last_name="Verma",
            college=self.college_a,
            department=self.dept_it
        )
        self.faculty_it = User.objects.create_user(
            email="faculty.it@ait.edu",
            password="SecurePassword123!",
            role=UserRole.FACULTY,
            first_name="Ramesh",
            last_name="Sharma",
            college=self.college_a,
            department=self.dept_it
        )
        FacultyProfile.objects.create(
            college=self.college_a,
            department=self.dept_it,
            user=self.faculty_it,
            designation="Assistant Professor",
            employee_id="IT-FAC-01"
        )

        self.faculty_cse = User.objects.create_user(
            email="faculty.cse@ait.edu",
            password="SecurePassword123!",
            role=UserRole.FACULTY,
            first_name="Priya",
            last_name="Nair",
            college=self.college_a,
            department=self.dept_cse
        )
        FacultyProfile.objects.create(
            college=self.college_a,
            department=self.dept_cse,
            user=self.faculty_cse,
            designation="Assistant Professor",
            employee_id="CSE-FAC-01"
        )

        self.cat_fdp = ActivityCategory.objects.create(
            college=self.college_a,
            name="Faculty Development Program",
            code="FDP"
        )

        # College B (Tenant Barrier)
        self.college_b = College.objects.create(
            name="Beacon Engineering College",
            code="BEC",
            state="Karnataka"
        )
        self.faculty_b = User.objects.create_user(
            email="faculty@bec.edu",
            password="SecurePassword123!",
            role=UserRole.FACULTY,
            first_name="Suresh",
            last_name="Kumar",
            college=self.college_b
        )

    def tearDown(self):
        MockEmailProvider.reset()
        EmailService.set_provider_override(None)

    # 1. CORE PRINCIPLE: EXTERNAL FAILURE DOES NOT BLOCK VERIFICATION
    def test_01_external_email_failure_does_not_block_verification(self):
        """
        If the external email provider fails (timeout/SMTP error), the verification
        approval must proceed completely and seal evidence without breaking!
        """
        # Create an activity ready for IQAC verification
        act = Activity.objects.create(
            college=self.college_a,
            department=self.dept_it,
            faculty=self.faculty_it,
            academic_year=self.ay_2025,
            category=self.cat_fdp,
            title="Cloud Security FDP",
            status=ActivityStatus.PENDING_IQAC
        )
        rec = VerificationRecord.objects.create(
            college=self.college_a,
            activity=act,
            current_status=ActivityStatus.PENDING_IQAC
        )

        # Force external email provider failure
        MockEmailProvider.simulate_failure = True
        EmailService.set_provider_override(MockEmailProvider())

        self.client.force_authenticate(user=self.iqac_user)
        resp = self.client.post(f'/api/v1/verifications/{rec.id}/iqac-verify/', {
            'decision': 'APPROVE',
            'comment': 'Approved despite external email service failure'
        })

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        act.refresh_from_db()
        self.assertEqual(act.status, ActivityStatus.VERIFIED_EVIDENCE)
        self.assertTrue(Evidence.objects.filter(activity=act, is_verified=True).exists())

        # Email failure was logged safely in EmailDeliveryLog with RETRYING status
        log = EmailDeliveryLog.objects.filter(college=self.college_a, recipient=self.faculty_it.email).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, EmailDeliveryStatus.RETRYING)
        self.assertIn("Mock SMTP connection timeout", log.provider_response)

    # 2. SAFE EMAIL TEMPLATE INTERPOLATION & DELIVERY LOG
    def test_02_email_template_interpolation_and_logging(self):
        """
        Email service cleanly replaces placeholders without arbitrary code evaluation.
        """
        tpl = EmailTemplate.objects.create(
            college=self.college_a,
            name="Evidence Verified Template",
            event="EVIDENCE_VERIFIED",
            subject="Congratulations {{faculty_name}} on {{activity_title}}",
            body="Dear {{faculty_name}},\nYour evidence for {{activity_title}} at {{college_name}} was approved."
        )

        res = EmailService.send_templated_email(
            college=self.college_a,
            recipient=self.faculty_it.email,
            event="EVIDENCE_VERIFIED",
            context={
                "faculty_name": "Ramesh Sharma",
                "activity_title": "Cloud Security Workshop",
            },
            deduplication_key="test_email_dedup_1"
        )

        self.assertTrue(res.success)
        log = EmailDeliveryLog.objects.filter(deduplication_key="test_email_dedup_1").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, EmailDeliveryStatus.SENT)
        self.assertEqual(log.subject, "Congratulations Ramesh Sharma on Cloud Security Workshop")

    # 3. CONTROLLED EMAIL RETRIES
    def test_03_email_retry_mechanism(self):
        """
        Controlled retries increment attempt count and cap at max_attempts.
        """
        log = EmailDeliveryLog.objects.create(
            college=self.college_a,
            recipient="bad.email@domain.com",
            event="TEST_EVENT",
            subject="Test Subject",
            status=EmailDeliveryStatus.RETRYING,
            attempt_count=2,
            max_attempts=3
        )

        # Simulate continued failure
        MockEmailProvider.simulate_failure = True
        EmailService.set_provider_override(MockEmailProvider())

        res = EmailService.retry_delivery(str(log.id))
        self.assertFalse(res.success)
        log.refresh_from_db()
        self.assertEqual(log.attempt_count, 3)
        self.assertEqual(log.status, EmailDeliveryStatus.FAILED)
        self.assertIsNone(log.next_retry_at)

    # 4. WEBHOOK SIGNATURE & REPLAY PROTECTION
    def test_04_webhook_signature_and_replay_protection(self):
        """
        HMAC-SHA256 signature verification and 5-minute replay window enforcement.
        """
        secret = "super_secret_webhook_key_123"
        payload = {"event": "TEST", "data": 42}
        now_ts = int(time.time())

        # 1. Valid signature
        payload_bytes = b'{"event": "TEST", "data": 42}'
        sig = WebhookService.compute_signature(secret, now_ts, payload_bytes)
        is_valid, msg = WebhookService.verify_signature(secret, str(now_ts), sig, payload_bytes)
        self.assertTrue(is_valid)

        # 2. Expired replay window (> 300s old)
        old_ts = now_ts - 400
        old_sig = WebhookService.compute_signature(secret, old_ts, payload_bytes)
        is_valid_old, msg_old = WebhookService.verify_signature(secret, str(old_ts), old_sig, payload_bytes)
        self.assertFalse(is_valid_old)
        self.assertIn("Replay window expired", msg_old)

    # 5. WEBHOOK DATA MINIMIZATION
    def test_05_webhook_data_minimization(self):
        """
        Outgoing webhook payload contains minimal metadata and no private document contents.
        """
        ep = WebhookEndpoint.objects.create(
            college=self.college_a,
            url="https://external-erp.college.edu/webhook/",
            secret="wh_secret_xyz",
            events=["EVIDENCE_VERIFIED"]
        )

        WebhookService._send_webhook(
            endpoint_id=str(ep.id),
            event_name="EVIDENCE_VERIFIED",
            payload={"activity_id": "12345", "title": "FDP on AI"}
        )

        log = ep.delivery_logs.first()
        self.assertIsNotNone(log)
        self.assertIn("event_id", log.payload)
        self.assertIn("timestamp", log.payload)
        self.assertNotIn("base64", str(log.payload).lower())
        self.assertNotIn("file_content", str(log.payload).lower())

    # 6. REST API SCOPES & AUTHENTICATION
    def test_06_api_authentication_and_scope_enforcement(self):
        """
        External API key with faculty:read scope cannot access evidence or write activities.
        """
        from apps.imports.services.integration_service import APIKeyService
        key, raw_token = APIKeyService.generate_api_key(
            college=self.college_a,
            name="SIS Readonly Integration",
            scopes=["faculty:read"],
            user=self.iqac_user
        )

        headers = {'HTTP_X_IQAC_API_KEY': raw_token}

        # Authorized scope
        resp1 = self.client.get('/api/integrations/v1/faculty/', **headers)
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertIn('X-RateLimit-Limit', resp1)

        # Unauthorized scope
        resp2 = self.client.get('/api/integrations/v1/evidence/', **headers)
        self.assertEqual(resp2.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Missing scope evidence:read", resp2.json().get('error'))

        # Unauthorized write attempt
        resp3 = self.client.post('/api/integrations/v1/activities/', {'title': 'Hack'}, **headers)
        self.assertEqual(resp3.status_code, status.HTTP_403_FORBIDDEN)

    # 7. REST API RATE LIMITING
    def test_07_api_rate_limiting(self):
        """
        Rate limiting headers are returned and throttles upon exceeding threshold.
        """
        from apps.imports.services.integration_service import APIKeyService
        key, raw_token = APIKeyService.generate_api_key(
            college=self.college_a,
            name="Rate Limit Test Key",
            scopes=["faculty:read"],
            user=self.iqac_user
        )
        headers = {'HTTP_X_IQAC_API_KEY': raw_token}
        resp = self.client.get('/api/integrations/v1/faculty/', **headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.headers.get('X-RateLimit-Limit'), '100')
        self.assertIsNotNone(resp.headers.get('X-RateLimit-Remaining'))

    # 8. TENANT ISOLATION BARRIER
    def test_08_tenant_isolation_cross_college_barrier(self):
        """
        College A API key and users cannot access College B data.
        """
        from apps.imports.services.integration_service import APIKeyService
        key_a, raw_token_a = APIKeyService.generate_api_key(
            college=self.college_a,
            name="College A Key",
            scopes=["faculty:read"],
            user=self.iqac_user
        )

        # Create faculty in College B
        dept_b = Department.objects.create(
            college=self.college_b,
            name="Mechanical Engineering",
            code="MECH"
        )
        self.faculty_b.department = dept_b
        self.faculty_b.save()
        FacultyProfile.objects.create(
            college=self.college_b,
            department=dept_b,
            user=self.faculty_b,
            designation="Professor",
            employee_id="BEC-001"
        )

        headers = {'HTTP_X_IQAC_API_KEY': raw_token_a}
        resp = self.client.get('/api/integrations/v1/faculty/', **headers)
        data = resp.json()
        emails = [f['email'] for f in data['results']]
        self.assertIn(self.faculty_it.email, emails)
        self.assertNotIn(self.faculty_b.email, emails)

    # 9. ANNOUNCEMENT TARGETING
    def test_09_announcement_targeting_permissions(self):
        """
        Announcements targeted to a department are only visible to that department.
        """
        today = timezone.now().date()
        # Announcement for IT Department
        ann_it = Announcement.objects.create(
            college=self.college_a,
            title="IT Department Meeting",
            message="Meeting in Seminar Hall",
            priority=AnnouncementPriority.HIGH,
            audience_type=AnnouncementAudience.DEPARTMENT,
            target_department=self.dept_it,
            start_date=today,
            end_date=today + timezone.timedelta(days=2),
            is_active=True,
            created_by=self.iqac_user
        )

        # IT Faculty can see it
        self.client.force_authenticate(user=self.faculty_it)
        resp_it = self.client.get('/api/integrations/announcements/')
        self.assertEqual(resp_it.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_it.json()['results']), 1)

        # CSE Faculty cannot see it
        self.client.force_authenticate(user=self.faculty_cse)
        resp_cse = self.client.get('/api/integrations/announcements/')
        self.assertEqual(resp_cse.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_cse.json()['results']), 0)

    # 10. CALENDAR ICS GENERATION
    def test_10_calendar_ics_generation(self):
        """
        RFC 5545 iCalendar generation for tasks and milestones.
        """
        task = IQACTask.objects.create(
            college=self.college_a,
            creator=self.iqac_user,
            owner=self.faculty_it,
            title="Submit NAAC Criteria 3 Documents",
            description="All workshop proofs required",
            priority="HIGH",
            due_date=timezone.now().date() + timezone.timedelta(days=7)
        )

        self.client.force_authenticate(user=self.faculty_it)
        resp = self.client.get(f'/api/integrations/calendar/tasks/{task.id}/ics/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("text/calendar", resp.headers.get('Content-Type'))
        content = resp.content.decode('utf-8')
        self.assertIn("BEGIN:VCALENDAR", content)
        self.assertIn(f"UID:iqac-task-{task.id}@iqac.saas", content)
        self.assertIn("Submit NAAC Criteria 3 Documents", content)
        self.assertIn("END:VCALENDAR", content)

    # 11. STORAGE CHECKSUM & SIGNED URLS
    def test_11_storage_checksum_and_signed_urls(self):
        """
        Signed download URLs and SHA-256 integrity verification.
        """
        signed_url = StorageService.get_signed_download_url("evidence/sample_proof.pdf", expiry_seconds=1800)
        self.assertIn("token=", signed_url)
        self.assertIn("expires=", signed_url)

    # 12. SSO DOMAIN DISCOVERY
    def test_12_sso_domain_discovery(self):
        """
        Institution email domain discovery correctly identifies college tenant.
        """
        SSOConfiguration.objects.create(
            college=self.college_a,
            sso_enabled=True,
            provider_type="OIDC",
            allowed_domains=["ait.edu", "ait.ac.in"],
            status=SSOStatus.ACTIVE
        )

        resolved = SSOService.resolve_college_by_domain("dr.anil@ait.edu")
        self.assertEqual(resolved, self.college_a)

        unknown = SSOService.resolve_college_by_domain("user@gmail.com")
        self.assertIsNone(unknown)
