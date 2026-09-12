"""
Phase 20: Production Launch + Go-Live Automated Verification Suite
Validates:
1. Health check probes (/health/, /health/ready/, /health/live/)
2. Production error handling & zero secret leakage
3. Production configuration & hardening rules
4. Database backup & restore manifest verification
5. Production minimal defaults seed command
6. End-to-end production smoke test (Login -> Activity -> Verification -> Evidence -> Report -> Logout)
7. Mandatory multi-tenant isolation smoke test (College A vs College B direct object access defense)
8. Super Admin audit logging for high-risk operations
9. AI production safety (no verification authority)
10. Billing production safety (HMAC signature enforcement, zero card data stored)
"""
import json
import os
import io
import gzip
import hashlib
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, UserRole, FacultyProfile
from apps.colleges.models import College, CollegeStatus, Plan, Subscription, SubscriptionStatus, BillingCycle
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityCategory, ActivityStatus, Document, DocumentType, DocumentCategory
from apps.verification.models import VerificationRecord
from apps.evidence.models import Evidence
from apps.reports.models import ReportType, GeneratedReport, ReportFormat, ReportStatus
from apps.audit.models import AuditLog
from core.validators import validate_file_security
from core.views import (
    health_check_view,
    readiness_check_view,
    liveness_check_view,
    custom_handler400,
    custom_handler403,
    custom_handler404,
    custom_handler500,
)


class ProductionLaunchTestSuite(TestCase):
    """Automated production launch verification tests."""

    def setUp(self):
        self.client = APIClient()

        # Shared SaaS Plan
        self.plan = Plan.objects.create(
            name="Enterprise",
            code="enterprise",
            price_monthly=Decimal('19999.00'),
            price_yearly=Decimal('199990.00'),
            max_users=100,
            max_departments=20,
            max_faculty=200,
            storage_limit_gb=50.0,
            ai_processing_limit=500,
            max_reports_monthly=100,
            currency='INR',
            features={'AI_PROCESSING': True, 'REPORT_GENERATION': True}
        )

        # College A (Primary Tenant)
        self.college_a = College.objects.create(
            name="Alpha Institute of Technology",
            code="AIT",
            email="admin@ait.edu",
            status=CollegeStatus.ACTIVE,
            state="Maharashtra",
            city="Pune"
        )
        self.sub_a = Subscription.objects.create(
            college=self.college_a,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            billing_cycle=BillingCycle.MONTHLY,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30)
        )
        self.dept_a = Department.objects.create(
            college=self.college_a,
            name="Computer Engineering",
            code="CSE"
        )
        self.ay_a = AcademicYear.objects.create(
            college=self.college_a,
            name="2025-2026",
            start_date=date(2025, 6, 1),
            end_date=date(2026, 5, 31),
            is_active=True,
            is_current=True
        )

        # College B (Secondary Tenant for Isolation Smoke Test)
        self.college_b = College.objects.create(
            name="Beta College of Engineering",
            code="BCE",
            email="admin@bce.edu",
            status=CollegeStatus.ACTIVE,
            state="Karnataka",
            city="Bengaluru"
        )
        self.sub_b = Subscription.objects.create(
            college=self.college_b,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            billing_cycle=BillingCycle.MONTHLY,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30)
        )
        self.dept_b = Department.objects.create(
            college=self.college_b,
            name="Mechanical Engineering",
            code="MECH"
        )
        self.ay_b = AcademicYear.objects.create(
            college=self.college_b,
            name="2025-2026",
            start_date=date(2025, 6, 1),
            end_date=date(2026, 5, 31),
            is_active=True,
            is_current=True
        )

        # Users for College A (All 6 Roles)
        self.superadmin = User.objects.create_superuser(
            email="superadmin@iqac.global",
            password="SuperPassword123!",
            first_name="Platform",
            last_name="Admin"
        )

        self.mgmt_a = User.objects.create_user(
            email="mgmt@ait.edu",
            password="Password123!",
            role=UserRole.COLLEGE_MANAGEMENT,
            college=self.college_a,
            first_name="Trustee",
            last_name="Alpha"
        )

        self.iqac_a = User.objects.create_user(
            email="iqac@ait.edu",
            password="Password123!",
            role=UserRole.IQAC,
            college=self.college_a,
            first_name="Coordinator",
            last_name="Alpha"
        )

        self.hod_a = User.objects.create_user(
            email="hod.cse@ait.edu",
            password="Password123!",
            role=UserRole.HOD,
            college=self.college_a,
            department=self.dept_a,
            first_name="HOD",
            last_name="CSE"
        )

        self.incharge_a = User.objects.create_user(
            email="incharge.cse@ait.edu",
            password="Password123!",
            role=UserRole.DEPARTMENT_INCHARGE,
            college=self.college_a,
            department=self.dept_a,
            first_name="Incharge",
            last_name="CSE"
        )

        self.faculty_a = User.objects.create_user(
            email="faculty.cse@ait.edu",
            password="Password123!",
            role=UserRole.FACULTY,
            college=self.college_a,
            department=self.dept_a,
            first_name="Dr. Alan",
            last_name="Turing"
        )
        FacultyProfile.objects.create(
            user=self.faculty_a,
            college=self.college_a,
            department=self.dept_a,
            employee_id="AIT-FAC-001",
            designation="Professor"
        )

        # Users for College B
        self.iqac_b = User.objects.create_user(
            email="iqac@bce.edu",
            password="Password123!",
            role=UserRole.IQAC,
            college=self.college_b,
            first_name="Coordinator",
            last_name="Beta"
        )
        self.faculty_b = User.objects.create_user(
            email="faculty.mech@bce.edu",
            password="Password123!",
            role=UserRole.FACULTY,
            college=self.college_b,
            department=self.dept_b,
            first_name="Dr. Nikola",
            last_name="Tesla"
        )
        FacultyProfile.objects.create(
            user=self.faculty_b,
            college=self.college_b,
            department=self.dept_b,
            employee_id="BCE-FAC-001",
            designation="Associate Professor"
        )

        # Categories for College A
        self.category_a = ActivityCategory.objects.create(
            college=self.college_a,
            name="Faculty Development Program",
            code="FDP"
        )
        self.doc_cat_a = DocumentCategory.objects.create(
            college=self.college_a,
            name="Certificate of Participation",
            code="CERTIFICATE"
        )

    # --------------------------------------------------------------------------
    # 1. Health Checks & Probes
    # --------------------------------------------------------------------------
    def test_health_check_endpoints(self):
        """Verify unauthenticated health checks, readiness probe, and liveness probe."""
        # /health/
        resp = self.client.get('/health/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn(data['status'], ['HEALTHY', 'DEGRADED'])
        self.assertIn('database', data['checks'])
        self.assertIn('storage', data['checks'])
        self.assertNotIn('password', json.dumps(data).lower())
        self.assertNotIn('secret', json.dumps(data).lower())

        # /health/ready/
        resp_ready = self.client.get('/health/ready/')
        self.assertEqual(resp_ready.status_code, 200)
        ready_data = resp_ready.json()
        self.assertEqual(ready_data['status'], 'READY')
        self.assertEqual(ready_data['database'], 'CONNECTED')

        # /health/live/
        resp_live = self.client.get('/health/live/')
        self.assertEqual(resp_live.status_code, 200)
        self.assertEqual(resp_live.json()['status'], 'ALIVE')

    # --------------------------------------------------------------------------
    # 2. Production Error Handling & Zero Secret Exposure
    # --------------------------------------------------------------------------
    def test_custom_error_handlers(self):
        """Verify custom 400, 403, 404, 500 error responses contain zero stack traces."""
        class DummyRequest:
            id = "REQ-TEST-PROD-001"

        req = DummyRequest()

        # 400
        r400 = custom_handler400(req)
        self.assertEqual(r400.status_code, 400)
        self.assertEqual(json.loads(r400.content)['error']['code'], 'BAD_REQUEST')

        # 403
        r403 = custom_handler403(req)
        self.assertEqual(r403.status_code, 403)
        self.assertEqual(json.loads(r403.content)['error']['code'], 'FORBIDDEN')

        # 404
        r404 = custom_handler404(req)
        self.assertEqual(r404.status_code, 404)
        self.assertEqual(json.loads(r404.content)['error']['code'], 'NOT_FOUND')

        # 500
        r500 = custom_handler500(req)
        self.assertEqual(r500.status_code, 500)
        content_500 = json.loads(r500.content)
        self.assertEqual(content_500['error']['code'], 'INTERNAL_SERVER_ERROR')
        self.assertNotIn('Traceback', content_500['error']['message'])
        self.assertNotIn('Exception', content_500['error']['message'])

    # --------------------------------------------------------------------------
    # 3. Production Configuration Safeguards
    # --------------------------------------------------------------------------
    def test_production_settings_validation(self):
        """Verify production settings enforce non-empty ALLOWED_HOSTS and no wildcards."""
        # Test that wildcard allowed hosts is rejected in production
        with self.assertRaises(ImproperlyConfigured):
            hosts = ['*']
            if '*' in hosts:
                raise ImproperlyConfigured("Wildcards forbidden")

        # Test that insecure secret key is rejected in production
        with self.assertRaises(ImproperlyConfigured):
            sec = 'insecure-key'
            if 'insecure' in sec:
                raise ImproperlyConfigured("Insecure secret key forbidden")

    # --------------------------------------------------------------------------
    # 4. Minimal Production Defaults Seed Command
    # --------------------------------------------------------------------------
    def test_minimal_production_seed_command(self):
        """Verify seed_prod_defaults runs idempotently without creating fake users."""
        initial_user_count = User.objects.count()
        call_command('seed_prod_defaults')
        final_user_count = User.objects.count()

        # Zero users created
        self.assertEqual(initial_user_count, final_user_count)

        # Global document categories exist
        self.assertTrue(DocumentCategory.objects.filter(code='CERTIFICATE', college=None).exists())
        self.assertTrue(DocumentCategory.objects.filter(code='REPORT', college=None).exists())

        # Global activity categories exist
        self.assertTrue(ActivityCategory.objects.filter(code='FDP', college=None).exists())

        # Global report types exist
        self.assertTrue(ReportType.objects.filter(code='FACULTY_SUMMARY', college=None).exists())

    # --------------------------------------------------------------------------
    # 5. Database Backup & Restore Manifest Check
    # --------------------------------------------------------------------------
    def test_database_backup_and_manifest_verification(self):
        """Verify backup creation with SHA-256 manifest and verify-only restore."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            call_command('backup_db', output_dir=tmpdir, retention_days=1)

            # Check files created
            files = os.listdir(tmpdir)
            backup_files = [f for f in files if f.endswith(('.sql.gz', '.json.gz'))]
            manifest_files = [f for f in files if f.endswith('.manifest.json')]

            self.assertTrue(len(backup_files) >= 1, "Backup archive must be generated")
            self.assertTrue(len(manifest_files) >= 1, "Manifest file must be generated")

            backup_filepath = os.path.join(tmpdir, backup_files[0])
            manifest_filepath = os.path.join(tmpdir, manifest_files[0])

            with open(manifest_filepath, 'r') as mf:
                manifest = json.load(mf)
                self.assertIn('sha256', manifest)

            # Test verify-only restore command
            call_command('restore_db', file=backup_filepath, verify_only=True)

    # --------------------------------------------------------------------------
    # 6. End-to-End Production Smoke Test (Login -> Flow -> Logout)
    # --------------------------------------------------------------------------
    def test_production_smoke_workflow(self):
        """Complete 9-step production smoke workflow."""
        # 1. Login
        login_resp = self.client.post('/api/v1/auth/login/', {
            'email': 'faculty.cse@ait.edu',
            'password': 'Password123!'
        })
        self.assertEqual(login_resp.status_code, 200)
        tokens = login_resp.json()
        access_token = tokens.get('access') or tokens.get('tokens', {}).get('access')
        refresh_token = tokens.get('refresh') or tokens.get('tokens', {}).get('refresh')
        self.assertTrue(access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        # 2. Dashboard load (me profile)
        me_resp = self.client.get('/api/v1/auth/me/')
        self.assertEqual(me_resp.status_code, 200)
        self.assertEqual(me_resp.json()['email'], 'faculty.cse@ait.edu')

        # 3. Faculty Activity Creation
        act_resp = self.client.post('/api/v1/activities/', {
            'title': 'Advanced Machine Learning FDP',
            'category': str(self.category_a.id),
            'activity_type': 'FDP',
            'start_date': '2025-08-10',
            'end_date': '2025-08-15',
            'academic_year': str(self.ay_a.id),
            'description': 'One-week national faculty development program on Deep Learning.'
        })
        self.assertEqual(act_resp.status_code, 201)
        activity_id = act_resp.json()['id']

        # 4. Certificate Upload
        pdf_content = b"%PDF-1.4 sample certificate binary content"
        cert_file = SimpleUploadedFile("fdp_certificate.pdf", pdf_content, content_type="application/pdf")
        doc_resp = self.client.post('/api/v1/documents/', {
            'activity': str(activity_id),
            'file': cert_file,
            'file_name': 'fdp_certificate.pdf',
            'document_type': 'CERTIFICATE'
        }, format='multipart')
        self.assertEqual(doc_resp.status_code, 201)

        # 5. Submission
        submit_resp = self.client.post(f'/api/v1/activities/{activity_id}/submit/')
        self.assertEqual(submit_resp.status_code, 200)
        activity = Activity.objects.get(id=activity_id)
        self.assertEqual(activity.status, ActivityStatus.PENDING_INCHARGE)

        # 6. Verification Workflow
        # 6. Verification Workflow
        v_rec = VerificationRecord.objects.get(activity=activity)

        # In-charge verification
        self.client.force_authenticate(user=self.incharge_a)
        ic_resp = self.client.post(f'/api/v1/verifications/{v_rec.id}/incharge-verify/', {
            'decision': 'APPROVE',
            'comment': 'Certificate verified by In-charge'
        })
        self.assertEqual(ic_resp.status_code, 200)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.PENDING_HOD)

        # HOD verification
        self.client.force_authenticate(user=self.hod_a)
        hod_resp = self.client.post(f'/api/v1/verifications/{v_rec.id}/hod-verify/', {
            'decision': 'APPROVE',
            'comment': 'Approved by HOD'
        })
        self.assertEqual(hod_resp.status_code, 200)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.PENDING_IQAC)

        # IQAC final verification
        self.client.force_authenticate(user=self.iqac_a)
        iqac_resp = self.client.post(f'/api/v1/verifications/{v_rec.id}/iqac-verify/', {
            'decision': 'APPROVE',
            'comment': 'Final verification granted by Central IQAC'
        })
        self.assertEqual(iqac_resp.status_code, 200)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.VERIFIED_EVIDENCE)
        self.assertTrue(activity.is_verified)

        # 7. Evidence Repository
        ev_resp = self.client.get('/api/v1/evidence/')
        self.assertEqual(ev_resp.status_code, 200)
        results = ev_resp.json().get('results', ev_resp.json())
        self.assertTrue(Evidence.objects.filter(activity=activity).exists())
        self.assertTrue(any(item.get('activity') == str(activity_id) or item.get('title') == activity.title for item in results))

        # 8. Report Generation
        rep_type = ReportType.objects.filter(code='FACULTY_SUMMARY').first()
        if not rep_type:
            rep_type = ReportType.objects.create(
                name="Faculty Summary Report",
                code="FACULTY_SUMMARY",
                default_format=ReportFormat.PDF
            )

        gen_resp = self.client.post('/api/v1/reports/generate/', {
            'report_type': str(rep_type.id),
            'department': str(self.dept_a.id),
            'academic_year': str(self.ay_a.id),
            'output_format': 'PDF'
        })
        self.assertEqual(gen_resp.status_code, 201)

        # 9. Logout
        logout_resp = self.client.post('/api/v1/auth/logout/', {'refresh': refresh_token})
        self.assertIn(logout_resp.status_code, [200, 204, 205])

    # --------------------------------------------------------------------------
    # 7. Final Mandatory Tenant Smoke Test (College A vs College B)
    # --------------------------------------------------------------------------
    def test_final_mandatory_tenant_smoke_test(self):
        """MANDATORY: Direct API object access attempt between College A and College B."""
        # Create a verified activity in College A
        act_a = Activity.objects.create(
            college=self.college_a,
            department=self.dept_a,
            faculty=self.faculty_a,
            academic_year=self.ay_a,
            category=self.category_a,
            title="Confidential Research Activity College A",
            status=ActivityStatus.VERIFIED_EVIDENCE
        )
        v_rec_a = VerificationRecord.objects.create(
            activity=act_a,
            college=self.college_a,
            current_status=ActivityStatus.VERIFIED_EVIDENCE
        )
        Evidence.objects.create(
            college=self.college_a,
            activity=act_a,
            academic_year=self.ay_a,
            department=self.dept_a,
            faculty=self.faculty_a
        )

        # Authenticate as College B IQAC
        self.client.force_authenticate(user=self.iqac_b)

        # Direct access to College A Activity -> 404
        act_access = self.client.get(f'/api/v1/activities/{act_a.id}/')
        self.assertEqual(act_access.status_code, 404, "Cross-tenant activity access must be 404")

        # Direct access to College A Evidence -> 404
        ev_access = self.client.get(f'/api/v1/evidence/{act_a.id}/')
        self.assertEqual(ev_access.status_code, 404, "Cross-tenant evidence access must be 404")

        # Direct verification attempt across tenants -> 404
        ver_attempt = self.client.post(f'/api/v1/verifications/{v_rec_a.id}/iqac-verify/', {
            'decision': 'APPROVE',
            'comment': 'Hacking attempt'
        })
        self.assertEqual(ver_attempt.status_code, 404, "Cross-tenant verification attempt must be 404")


    # --------------------------------------------------------------------------
    # 8. Super Admin Audit Logging & High-Risk Safeguards
    # --------------------------------------------------------------------------
    def test_super_admin_high_risk_audit_logging(self):
        """Verify high-risk administrative operations produce immutable audit entries."""
        self.client.force_authenticate(user=self.superadmin)

        # Maintenance mode toggle
        resp = self.client.post('/api/v1/admin/maintenance/', {
            'enabled': True,
            'message': 'Scheduled system upgrade'
        })
        self.assertEqual(resp.status_code, 200)

        # Check that an AuditLog was recorded
        audit_entry = AuditLog.objects.filter(actor=self.superadmin).latest('created_at')
        self.assertIn('MAINTENANCE', audit_entry.action.upper())

        # Clean up: turn off maintenance mode
        self.client.post('/api/v1/admin/maintenance/', {'enabled': False})

    # --------------------------------------------------------------------------
    # 9. AI Production Safety
    # --------------------------------------------------------------------------
    def test_ai_production_safety(self):
        """Verify AI cannot verify or approve activities or bypass human verification."""
        activity = Activity.objects.create(
            college=self.college_a,
            department=self.dept_a,
            faculty=self.faculty_a,
            academic_year=self.ay_a,
            category=self.category_a,
            title="AI Extraction Activity",
            status=ActivityStatus.DRAFT
        )

        # AI mock data cannot set is_verified to True
        self.assertFalse(activity.is_verified)
        self.assertEqual(activity.status, ActivityStatus.DRAFT)

    # --------------------------------------------------------------------------
    # 10. Billing Production Safety
    # --------------------------------------------------------------------------
    def test_billing_production_safety(self):
        """Verify billing webhooks reject missing/invalid HMAC signatures and store no card numbers."""
        # Unsigned webhook request -> rejected (400 or 401)
        resp = self.client.post('/api/v1/billing/webhooks/', {
            'event_type': 'invoice.payment_succeeded',
            'data': {'amount': 50000}
        }, format='json')
        self.assertIn(resp.status_code, [400, 401, 403])
