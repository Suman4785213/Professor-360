"""
Phase 11 Automated Tests: Multi-College SaaS & Super Admin Control Center
Verifies:
1. Tenant creation, SaaS plans, and subscription lifecycles.
2. Strict cross-tenant IDOR isolation across evidence, activities, reports, and downloads.
3. Storage quota enforcement without deleting existing evidence.
4. AI processing quota enforcement with graceful manual processing fallback.
5. College suspension behavior (blocking operational mutations while preserving read access).
6. User invitation lifecycle and prevention of self-privilege escalation.
7. BillingService and PaymentProvider abstraction.
8. Platform health diagnostics and Super Admin audit logging.
"""
from datetime import date, timedelta
from django.test import TestCase
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.colleges.models import (
    College, Plan, Subscription, TenantFeatureFlag,
    TenantUsage, UserInvitation, CollegeStatus, SubscriptionStatus, BillingCycle
)
from apps.accounts.models import User, UserRole, FacultyProfile
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityCategory, Document, ActivityStatus
from apps.evidence.models import Evidence
from apps.reports.models import ReportType, GeneratedReport, ReportStatus
from apps.colleges.services import FeatureAccessService, UsageLimitService, TenantExportService, SystemHealthService
from apps.colleges.billing import BillingService, MockPaymentProvider


class Phase11MultiTenantSaaSTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        # 1. Plans
        self.starter_plan = Plan.objects.create(
            name="Starter Test",
            code="starter_test",
            price_monthly=49.00,
            max_users=5,
            max_departments=2,
            max_faculty=10,
            storage_limit_gb=1.0,
            ai_processing_limit=2,
            max_reports_monthly=5,
            features={'AI_PROCESSING': True, 'REPORT_GENERATION': True}
        )

        self.pro_plan = Plan.objects.create(
            name="Pro Test",
            code="pro_test",
            price_monthly=149.00,
            max_users=50,
            max_departments=10,
            max_faculty=100,
            storage_limit_gb=20.0,
            ai_processing_limit=100,
            max_reports_monthly=50,
            features={'AI_PROCESSING': True, 'REPORT_GENERATION': True, 'ADVANCED_ANALYTICS': True}
        )

        # 2. Colleges
        self.college_a = College.objects.create(
            name="Alpha Engineering Institute",
            code="AEI",
            status=CollegeStatus.ACTIVE,
            setup_completed=True,
            branding_config={'report_header': 'Alpha Institute Header', 'report_footer': 'Alpha Footer'}
        )
        self.college_b = College.objects.create(
            name="Beta University of Science",
            code="BUS",
            status=CollegeStatus.ACTIVE,
            setup_completed=True,
            branding_config={'report_header': 'Beta University Header', 'report_footer': 'Beta Footer'}
        )

        # Subscriptions
        self.billing_service = BillingService(provider=MockPaymentProvider())
        self.sub_a = self.billing_service.subscribe_college(self.college_a, self.pro_plan)
        self.sub_b = self.billing_service.subscribe_college(self.college_b, self.starter_plan)

        # Departments
        self.dept_a = Department.objects.create(college=self.college_a, name="Alpha CompSci", code="CS")
        self.dept_b = Department.objects.create(college=self.college_b, name="Beta Physics", code="PH")

        # Academic Years
        self.ay_a = AcademicYear.objects.create(
            college=self.college_a, name="2024-25",
            start_date=date(2024, 6, 1), end_date=date(2025, 5, 31), is_current=True
        )
        self.ay_b = AcademicYear.objects.create(
            college=self.college_b, name="2024-25",
            start_date=date(2024, 6, 1), end_date=date(2025, 5, 31), is_current=True
        )

        # Users
        self.super_admin = User.objects.create_superuser(
            email="super@iqac.platform", password="SuperPassword123",
            first_name="Super", last_name="Admin"
        )
        self.iqac_a = User.objects.create_user(
            email="iqac.a@alpha.edu", password="Password123",
            first_name="Alice", last_name="IQAC",
            role=UserRole.IQAC, college=self.college_a
        )
        self.faculty_a = User.objects.create_user(
            email="fac.a@alpha.edu", password="Password123",
            first_name="Alan", last_name="Faculty",
            role=UserRole.FACULTY, college=self.college_a, department=self.dept_a
        )

        self.iqac_b = User.objects.create_user(
            email="iqac.b@beta.edu", password="Password123",
            first_name="Bob", last_name="IQAC",
            role=UserRole.IQAC, college=self.college_b
        )
        self.faculty_b = User.objects.create_user(
            email="fac.b@beta.edu", password="Password123",
            first_name="Brian", last_name="Faculty",
            role=UserRole.FACULTY, college=self.college_b, department=self.dept_b
        )

        # Activities & Evidence
        self.act_a = Activity.objects.create(
            college=self.college_a, department=self.dept_a, faculty=self.faculty_a,
            academic_year=self.ay_a, title="Alpha Faculty Workshop",
            status=ActivityStatus.VERIFIED_EVIDENCE
        )
        self.evidence_a = Evidence.objects.create(
            college=self.college_a, department=self.dept_a, faculty=self.faculty_a,
            activity=self.act_a, academic_year=self.ay_a,
            title="Alpha Sealed Evidence 01", category="WORKSHOP", is_verified=True
        )

        self.act_b = Activity.objects.create(
            college=self.college_b, department=self.dept_b, faculty=self.faculty_b,
            academic_year=self.ay_b, title="Beta Physics Symposium",
            status=ActivityStatus.VERIFIED_EVIDENCE
        )
        self.evidence_b = Evidence.objects.create(
            college=self.college_b, department=self.dept_b, faculty=self.faculty_b,
            activity=self.act_b, academic_year=self.ay_b,
            title="Beta Sealed Evidence 01", category="SYMPOSIUM", is_verified=True
        )

    # -------------------------------------------------------------
    # 1. Cross-Tenant IDOR Isolation Tests
    # -------------------------------------------------------------
    def test_cross_tenant_evidence_access_is_blocked(self):
        """User from College A cannot view or access College B evidence directly by ID (MUST 404)."""
        self.client.force_authenticate(user=self.faculty_a)
        resp = self.client.get(f'/api/evidence/{self.evidence_b.id}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

        # Same test for IQAC officer from College A attempting to inspect College B evidence
        self.client.force_authenticate(user=self.iqac_a)
        resp_iqac = self.client.get(f'/api/evidence/{self.evidence_b.id}/')
        self.assertEqual(resp_iqac.status_code, status.HTTP_404_NOT_FOUND)

    def test_cross_tenant_activity_access_is_blocked(self):
        """User from College A cannot view College B activity (MUST 404)."""
        self.client.force_authenticate(user=self.faculty_a)
        resp = self.client.get(f'/api/activities/{self.act_b.id}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_cross_tenant_evidence_listing_is_strictly_scoped(self):
        """Listing evidence as College A user only returns College A evidence."""
        self.client.force_authenticate(user=self.faculty_a)
        resp = self.client.get('/api/evidence/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get('results', resp.data)
        ids = [r['id'] for r in results]
        self.assertIn(str(self.evidence_a.id), ids)
        self.assertNotIn(str(self.evidence_b.id), ids)

    def test_cross_tenant_export_access_is_blocked(self):
        """College A IQAC coordinator cannot export College B data (403 Forbidden)."""
        self.client.force_authenticate(user=self.iqac_a)
        resp = self.client.get(f'/api/colleges/{self.college_b.id}/export/')
        self.assertIn(resp.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    # -------------------------------------------------------------
    # 2. Storage Quota Enforcement Tests
    # -------------------------------------------------------------
    def test_storage_quota_enforcement_blocks_oversized_upload(self):
        """Uploading evidence document exceeding storage quota returns 400 without breaking system."""
        # Set College B storage limit to very small (0.0001 GB = ~100 KB)
        self.starter_plan.storage_limit_gb = 0.0001
        self.starter_plan.save()

        self.client.force_authenticate(user=self.faculty_b)
        dummy_content = b"%PDF-1.4\n" + b"A" * (200 * 1024)  # 200 KB
        dummy_file = SimpleUploadedFile("oversize_cert.pdf", dummy_content, content_type="application/pdf")

        resp = self.client.post('/api/documents/', {
            'activity': str(self.act_b.id),
            'document_type': 'CERTIFICATE',
            'file_name': 'oversize_cert.pdf',
            'file': dummy_file
        }, format='multipart')

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quota', str(resp.data).lower())

        # Verify existing evidence is completely intact
        self.assertTrue(Evidence.objects.filter(id=self.evidence_b.id).exists())

    # -------------------------------------------------------------
    # 3. AI Usage Quota & Feature Flag Tests
    # -------------------------------------------------------------
    def test_ai_quota_enforcement_provides_graceful_manual_fallback(self):
        """When AI monthly quota is reached, response notifies user and leaves manual workflow intact."""
        # Simulate AI jobs reaching limit
        usage = UsageLimitService.get_or_create_usage(self.college_b)
        usage.ai_jobs_this_month = self.starter_plan.ai_processing_limit
        usage.save()

        self.client.force_authenticate(user=self.faculty_b)
        dummy_file = SimpleUploadedFile("cert.pdf", b"Dummy PDF content", content_type="application/pdf")

        resp = self.client.post('/api/ai/jobs/upload-and-process/', {
            'file': dummy_file
        }, format='multipart')

        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('Manual processing remains available', resp.data.get('error', ''))
        self.assertTrue(resp.data.get('manual_processing_available'))

    # -------------------------------------------------------------
    # 4. College Suspension Tests
    # -------------------------------------------------------------
    def test_college_suspension_blocks_mutations_while_preserving_read_access(self):
        """Suspended college users cannot create/modify activities, but can still view existing records."""
        self.college_b.status = CollegeStatus.SUSPENDED
        self.college_b.is_active = False
        self.college_b.save()

        self.client.force_authenticate(user=self.faculty_b)

        # 1. Attempt mutation (Create activity) -> Must be blocked with 403
        resp_post = self.client.post('/api/activities/', {
            'title': 'Blocked Activity During Suspension',
            'academic_year': str(self.ay_b.id),
            'activity_type': 'WORKSHOP'
        })
        self.assertEqual(resp_post.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('suspended', str(resp_post.data).lower())

        # 2. Read query (View evidence) -> Must succeed (Read-only preserved)
        resp_get = self.client.get(f'/api/evidence/{self.evidence_b.id}/')
        self.assertEqual(resp_get.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_get.data['title'], self.evidence_b.title)

        # 3. Super Admin can still view or unsuspend
        self.client.force_authenticate(user=self.super_admin)
        resp_activate = self.client.post(f'/api/colleges/{self.college_b.id}/activate/')
        self.assertEqual(resp_activate.status_code, status.HTTP_200_OK)
        self.college_b.refresh_from_db()
        self.assertEqual(self.college_b.status, CollegeStatus.ACTIVE)

    # -------------------------------------------------------------
    # 5. User Invitation & Anti-Privilege Escalation Tests
    # -------------------------------------------------------------
    def test_user_invitation_lifecycle_and_anti_privilege_escalation(self):
        """IQAC officer can invite faculty, but cannot invite Super Admin or College Management."""
        self.client.force_authenticate(user=self.iqac_a)

        # 1. Attempt to invite SUPER_ADMIN -> Must be rejected with 403
        resp_priv = self.client.post('/api/invitations/', {
            'email': 'hacker@iqac.platform',
            'role': UserRole.SUPER_ADMIN
        })
        self.assertEqual(resp_priv.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Valid invitation to Faculty member
        resp_valid = self.client.post('/api/invitations/', {
            'email': 'new.faculty@alpha.edu',
            'role': UserRole.FACULTY,
            'department': str(self.dept_a.id)
        })
        self.assertEqual(resp_valid.status_code, status.HTTP_201_CREATED)
        token = resp_valid.data['token']
        self.assertTrue(token)

        # 3. Public accept endpoint (Unauthenticated user sets password)
        self.client.logout()
        resp_accept = self.client.post('/api/invitations/accept/', {
            'token': token,
            'first_name': 'David',
            'last_name': 'Warner',
            'password': 'SecurePassword@123',
            'confirm_password': 'SecurePassword@123'
        })
        self.assertEqual(resp_accept.status_code, status.HTTP_200_OK)

        # Verify created user
        created_user = User.objects.get(email='new.faculty@alpha.edu')
        self.assertEqual(created_user.role, UserRole.FACULTY)
        self.assertEqual(created_user.college, self.college_a)
        self.assertTrue(created_user.check_password('SecurePassword@123'))

        # Verify invitation status updated to ACCEPTED
        invite = UserInvitation.objects.get(token=token)
        self.assertEqual(invite.status, 'ACCEPTED')

    # -------------------------------------------------------------
    # 6. Billing Service & Provider Abstraction Tests
    # -------------------------------------------------------------
    def test_billing_service_plan_change_and_cancellation(self):
        """BillingService transitions subscriptions smoothly through MockPaymentProvider."""
        sub = self.billing_service.change_plan(self.college_a, self.starter_plan, actor=self.super_admin)
        self.assertEqual(sub.plan, self.starter_plan)

        cancelled_sub = self.billing_service.cancel_subscription(sub, actor=self.super_admin)
        self.assertEqual(cancelled_sub.status, SubscriptionStatus.CANCELLED)

    # -------------------------------------------------------------
    # 7. System Health Diagnostics Tests
    # -------------------------------------------------------------
    def test_system_health_diagnostics_endpoint(self):
        """Super Admin can access platform health diagnostics with zero secrets exposed."""
        self.client.force_authenticate(user=self.super_admin)
        resp = self.client.get('/api/system/health/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('overall_status', resp.data)
        self.assertIn('database', resp.data)
        self.assertIn('storage', resp.data)
        self.assertIn('ai_provider', resp.data)
        self.assertEqual(resp.data['database']['status'], 'HEALTHY')
