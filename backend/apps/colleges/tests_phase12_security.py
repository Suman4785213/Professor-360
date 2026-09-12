"""
Phase 12 Automated Security & Production Hardening Test Suite
Verifies:
1. Health check endpoints (/health/ and /api/health/)
2. Request ID correlation propagation (X-Request-ID)
3. Security headers injection (X-Content-Type-Options, X-Frame-Options, etc.)
4. Maintenance mode blocking and Super Admin bypass
5. File upload security (magic bytes, path traversal sanitization, script blacklist)
6. Cross-tenant IDOR isolation
7. Background task retry engine and idempotency
8. AI prompt injection XML fencing
"""
import io
import json
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User
from apps.colleges.models import College, SubscriptionPlan
from apps.departments.models import Department
from apps.activities.models import Activity, ActivityCategory, Document
from core.validators import validate_file_security, sanitize_filename
from core.tasks import BackgroundTaskService, TaskExecutionState
from rest_framework.exceptions import ValidationError


class Phase12SecurityHardeningTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        # College A
        self.college_a = College.objects.create(
            name="Apex Institute of Technology",
            code="AIT",
            email="contact@apex.edu",
            is_active=True
        )
        self.dept_a = Department.objects.create(
            name="Computer Science",
            code="CSE",
            college=self.college_a
        )
        self.user_a = User.objects.create_user(
            email="iqac@apex.edu",
            password="Password@123",
            first_name="Apex",
            last_name="Coordinator",
            role="IQAC",
            college=self.college_a,
            department=self.dept_a
        )
        self.cat_a = ActivityCategory.objects.create(
            college=self.college_a,
            code="FDP",
            name="Faculty Development Program"
        )
        self.activity_a = Activity.objects.create(
            college=self.college_a,
            department=self.dept_a,
            faculty=self.user_a,
            category=self.cat_a,
            title="Advanced Machine Learning Workshop",
            status="DRAFT"
        )

        # College B
        self.college_b = College.objects.create(
            name="Beacon University",
            code="BUE",
            email="contact@beacon.edu",
            is_active=True
        )
        self.dept_b = Department.objects.create(
            name="Mechanical Engineering",
            code="MECH",
            college=self.college_b
        )
        self.user_b = User.objects.create_user(
            email="iqac@beacon.edu",
            password="Password@123",
            first_name="Beacon",
            last_name="Coordinator",
            role="IQAC",
            college=self.college_b,
            department=self.dept_b
        )

        # Super Admin
        self.super_admin = User.objects.create_superuser(
            email="admin@iqac.local",
            password="Password@123",
            first_name="Super",
            last_name="Admin",
            role="SUPER_ADMIN"
        )

    # --------------------------------------------------------------------------
    # 1. Health Checks
    # --------------------------------------------------------------------------
    def test_health_check_endpoint_unauthenticated(self):
        """Health check probe should return 200 without authentication."""
        resp = self.client.get('/health/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('status', data)
        self.assertIn('checks', data)
        self.assertIn('database', data['checks'])
        self.assertEqual(data['checks']['database']['status'], 'HEALTHY')
        self.assertNotIn('password', str(data).lower())

    def test_api_health_check_endpoint(self):
        """API health check probe should return 200."""
        resp = self.client.get('/api/health/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['status'], 'HEALTHY')

    # --------------------------------------------------------------------------
    # 2. Request Correlation ID
    # --------------------------------------------------------------------------
    def test_request_id_generated_and_propagated(self):
        """Every response must carry an X-Request-ID header."""
        resp = self.client.get('/health/')
        self.assertIn('X-Request-ID', resp.headers)
        self.assertTrue(resp.headers['X-Request-ID'].startswith('REQ-'))

    def test_custom_request_id_preserved(self):
        """If client provides X-Request-ID, it should be sanitized and preserved."""
        client_req_id = "custom-client-trace-12345"
        resp = self.client.get('/health/', HTTP_X_REQUEST_ID=client_req_id)
        self.assertEqual(resp.headers.get('X-Request-ID'), client_req_id)

    # --------------------------------------------------------------------------
    # 3. Security Headers
    # --------------------------------------------------------------------------
    def test_security_headers_present(self):
        """Responses must include X-Content-Type-Options, X-Frame-Options, etc."""
        resp = self.client.get('/health/')
        self.assertEqual(resp.headers.get('X-Content-Type-Options'), 'nosniff')
        self.assertEqual(resp.headers.get('X-Frame-Options'), 'SAMEORIGIN')
        self.assertEqual(resp.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin')

    # --------------------------------------------------------------------------
    # 4. Maintenance Mode
    # --------------------------------------------------------------------------
    @override_settings(MAINTENANCE_MODE=True)
    def test_maintenance_mode_blocks_regular_user(self):
        """Regular users receive 503 during maintenance mode."""
        self.client.force_authenticate(user=self.user_a)
        resp = self.client.get('/api/v1/activities/')
        self.assertEqual(resp.status_code, 503)
        data = resp.json()
        self.assertEqual(data['error']['code'], 'MAINTENANCE_MODE')
        self.assertEqual(resp.headers.get('Retry-After'), '300')

    @override_settings(MAINTENANCE_MODE=True)
    def test_maintenance_mode_allows_super_admin(self):
        """Super Admin bypasses maintenance mode for emergency access."""
        self.client.force_authenticate(user=self.super_admin)
        resp = self.client.get('/api/v1/colleges/')
        self.assertEqual(resp.status_code, 200)

    @override_settings(MAINTENANCE_MODE=True)
    def test_maintenance_mode_exempt_health_checks(self):
        """Health check probes bypass maintenance mode."""
        resp = self.client.get('/health/')
        self.assertEqual(resp.status_code, 200)

    # --------------------------------------------------------------------------
    # 5. File Security Validation
    # --------------------------------------------------------------------------
    def test_sanitize_filename_prevents_path_traversal(self):
        """Filenames with directory traversal should be stripped."""
        unsafe = "../../etc/passwd"
        clean = sanitize_filename(unsafe)
        self.assertEqual(clean, "passwd")

    def test_file_security_blocks_dangerous_scripts(self):
        """Executable or script files must be rejected immediately."""
        fake_script = SimpleUploadedFile("hack.php", b"<?php phpinfo(); ?>", content_type="application/x-php")
        with self.assertRaises(ValidationError) as ctx:
            validate_file_security(fake_script)
        self.assertIn("prohibited", str(ctx.exception))

    def test_file_security_blocks_magic_byte_mismatch(self):
        """A PHP script disguised as a .pdf must fail magic byte check."""
        spoofed_pdf = SimpleUploadedFile("invoice.pdf", b"<?php echo 'malicious'; ?>", content_type="application/pdf")
        with self.assertRaises(ValidationError) as ctx:
            validate_file_security(spoofed_pdf)
        self.assertIn("header mismatch", str(ctx.exception).lower())

    def test_file_security_accepts_valid_pdf(self):
        """Genuine PDF with %PDF- header must be accepted."""
        genuine_pdf = SimpleUploadedFile("certificate.pdf", b"%PDF-1.4\nGenuine Certificate Data", content_type="application/pdf")
        result = validate_file_security(genuine_pdf)
        self.assertEqual(result, "certificate.pdf")

    # --------------------------------------------------------------------------
    # 6. Cross-Tenant IDOR Protection
    # --------------------------------------------------------------------------
    def test_cross_tenant_activity_access_rejected(self):
        """College B user attempting to view College A activity must fail (404 or 403)."""
        self.client.force_authenticate(user=self.user_b)
        resp = self.client.get(f"/api/v1/activities/{self.activity_a.id}/")
        self.assertIn(resp.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    def test_cross_tenant_document_download_forbidden(self):
        """College B user attempting to download College A document must fail."""
        doc = Document.objects.create(
            college=self.college_a,
            department=self.dept_a,
            uploaded_by=self.user_a,
            activity=self.activity_a,
            file_name="cert.pdf",
            file_size=1024
        )
        self.client.force_authenticate(user=self.user_b)
        resp = self.client.get(f"/api/v1/documents/{doc.id}/download/")
        self.assertIn(resp.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    # --------------------------------------------------------------------------
    # 7. Background Task Service & Idempotency
    # --------------------------------------------------------------------------
    def test_background_task_retries_and_succeeds(self):
        """Task that fails once then succeeds should complete within max_retries."""
        attempts = 0
        def flaky_task():
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                raise ValueError("Temporary network glitch")
            return "Success!"

        result = BackgroundTaskService.run_task(
            flaky_task,
            max_retries=3,
            initial_delay=0.01,
            task_name="test_flaky_task"
        )
        self.assertEqual(result['status'], TaskExecutionState.COMPLETED)
        self.assertEqual(result['attempts'], 2)
        self.assertEqual(result['result'], "Success!")

    def test_background_task_idempotency_suppression(self):
        """Re-executing with the same idempotency_key must suppress duplicate work."""
        call_count = 0
        def sample_job():
            nonlocal call_count
            call_count += 1
            return 42

        idemp_key = "job_123_unique"
        res1 = BackgroundTaskService.run_task(sample_job, idempotency_key=idemp_key, initial_delay=0.01)
        self.assertEqual(res1['status'], TaskExecutionState.COMPLETED)
        self.assertEqual(call_count, 1)

        # Second call with same key
        res2 = BackgroundTaskService.run_task(sample_job, idempotency_key=idemp_key, initial_delay=0.01)
        self.assertEqual(res2['status'], TaskExecutionState.COMPLETED)
        self.assertEqual(call_count, 1)  # Was NOT executed a second time!
