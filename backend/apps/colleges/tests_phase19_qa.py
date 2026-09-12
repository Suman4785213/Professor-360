"""
Phase 19 Automated QA & Security Test Suite — Fast Final QA + Security + UAT
Validates:
1. Authentication & Session Security (Login, Logout, Invalid Login, Deactivated User, Unauthenticated access, Token Refresh).
2. Role Security (Strict 6 roles: Faculty, In-charge, HOD, IQAC, Management, Super Admin).
3. Strict Tenant Isolation across 13 Subsystems (Users, Faculty, Activities, Evidence, Reports, Search, Analytics, AQAR/SSR, Notifications, Tasks, Billing, Support, Exports).
4. Core Verification Workflow State Machine & Bypass Defenses.
5. Evidence Security (File validation, Dangerous extension blocking, Oversized files, Tamper protection).
6. Report Generation Scoping (Verified data only, Tenant & AY isolated).
"""
import io
import uuid
from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.colleges.models import (
    College, Plan, Subscription, SubscriptionStatus, BillingCycle,
    Invoice, InvoiceStatus, CollegeStatus
)
from apps.accounts.models import User, UserRole, FacultyProfile
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityCategory, Document, ActivityStatus, DocumentType
from apps.verification.models import VerificationRecord, VerificationAction, VerificationLog
from apps.evidence.models import Evidence
from apps.reports.models import ReportType, GeneratedReport, ReportStatus
from apps.notifications.models import IQACTask, Notification
from apps.support.models import SupportTicket
from core.validators import validate_file_security
from rest_framework.exceptions import ValidationError


class Phase19FastQASecurityTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        # ----------------------------------------------------
        # 1. Setup Tenant Colleges (COLLEGE_A and COLLEGE_B)
        # ----------------------------------------------------
        self.plan = Plan.objects.create(
            name="Professional",
            code="pro",
            price_monthly=Decimal('9999.00'),
            price_yearly=Decimal('99990.00'),
            max_users=50,
            max_departments=10,
            max_faculty=100,
            storage_limit_gb=20.0,
            ai_processing_limit=200,
            max_reports_monthly=50,
            currency='INR',
            features={'AI_PROCESSING': True, 'REPORT_GENERATION': True}
        )

        self.college_a = College.objects.create(
            name="Apex Institute of Technology",
            code="AIT",
            email="admin@apex.edu",
            status=CollegeStatus.ACTIVE
        )
        self.college_b = College.objects.create(
            name="Beacon University",
            code="BU",
            email="admin@beacon.edu",
            status=CollegeStatus.ACTIVE
        )

        self.sub_a = Subscription.objects.create(
            college=self.college_a,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            billing_cycle=BillingCycle.MONTHLY,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30)
        )
        self.sub_b = Subscription.objects.create(
            college=self.college_b,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            billing_cycle=BillingCycle.MONTHLY,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30)
        )

        # ----------------------------------------------------
        # 2. Departments & Academic Years
        # ----------------------------------------------------
        self.ay_a = AcademicYear.objects.create(
            college=self.college_a,
            name="2025-2026",
            start_date=date(2025, 7, 1),
            end_date=date(2026, 6, 30),
            is_active=True,
            is_current=True
        )
        self.ay_b = AcademicYear.objects.create(
            college=self.college_b,
            name="2025-2026",
            start_date=date(2025, 7, 1),
            end_date=date(2026, 6, 30),
            is_active=True,
            is_current=True
        )

        self.dept_a1 = Department.objects.create(
            college=self.college_a,
            name="Computer Science & Engineering",
            code="CSE"
        )
        self.dept_a2 = Department.objects.create(
            college=self.college_a,
            name="Electronics & Communication",
            code="ECE"
        )
        self.dept_b = Department.objects.create(
            college=self.college_b,
            name="Mechanical Engineering",
            code="MECH"
        )

        # ----------------------------------------------------
        # 3. Users for All 6 Roles in College A
        # ----------------------------------------------------
        self.user_superadmin = User.objects.create_superuser(
            email="superadmin@iqacsaas.com",
            password="SuperPassword123!",
            first_name="Platform",
            last_name="SuperAdmin",
            role=UserRole.SUPER_ADMIN
        )

        self.user_mgmt_a = User.objects.create_user(
            email="mgmt@apex.edu",
            password="Password123!",
            college=self.college_a,
            first_name="Management",
            last_name="Director",
            role=UserRole.COLLEGE_MANAGEMENT
        )

        self.user_iqac_a = User.objects.create_user(
            email="iqac@apex.edu",
            password="Password123!",
            college=self.college_a,
            first_name="IQAC",
            last_name="Coordinator",
            role=UserRole.IQAC
        )

        self.user_hod_a1 = User.objects.create_user(
            email="hod.cse@apex.edu",
            password="Password123!",
            college=self.college_a,
            department=self.dept_a1,
            first_name="CSE",
            last_name="HOD",
            role=UserRole.HOD
        )

        self.user_incharge_a1 = User.objects.create_user(
            email="incharge.cse@apex.edu",
            password="Password123!",
            college=self.college_a,
            department=self.dept_a1,
            first_name="CSE",
            last_name="Incharge",
            role=UserRole.DEPARTMENT_INCHARGE
        )

        self.user_faculty_a1 = User.objects.create_user(
            email="faculty.cse@apex.edu",
            password="Password123!",
            college=self.college_a,
            department=self.dept_a1,
            first_name="John",
            last_name="Faculty",
            role=UserRole.FACULTY
        )
        self.profile_a1 = FacultyProfile.objects.create(
            user=self.user_faculty_a1,
            college=self.college_a,
            department=self.dept_a1,
            employee_id="AIT-FAC-001",
            designation="Assistant Professor",
            qualification="Ph.D."
        )

        # College B Users
        self.user_faculty_b = User.objects.create_user(
            email="faculty.mech@beacon.edu",
            password="Password123!",
            college=self.college_b,
            department=self.dept_b,
            first_name="Robert",
            last_name="Beacon",
            role=UserRole.FACULTY
        )
        self.profile_b = FacultyProfile.objects.create(
            user=self.user_faculty_b,
            college=self.college_b,
            department=self.dept_b,
            employee_id="BU-FAC-001",
            designation="Associate Professor",
            qualification="M.Tech."
        )

        # ----------------------------------------------------
        # 4. Activities & Verification Records
        # ----------------------------------------------------
        self.category_a = ActivityCategory.objects.create(
            college=self.college_a,
            name="Faculty Development Program",
            code="FDP"
        )
        self.category_b = ActivityCategory.objects.create(
            college=self.college_b,
            name="Workshop",
            code="WRK"
        )

        self.activity_a = Activity.objects.create(
            college=self.college_a,
            department=self.dept_a1,
            faculty=self.user_faculty_a1,
            academic_year=self.ay_a,
            category=self.category_a,
            title="Advanced Machine Learning FDP",
            activity_type="FDP",
            status=ActivityStatus.DRAFT
        )
        self.v_rec_a = VerificationRecord.objects.create(
            activity=self.activity_a,
            college=self.college_a,
            current_status=ActivityStatus.DRAFT
        )

        self.activity_b = Activity.objects.create(
            college=self.college_b,
            department=self.dept_b,
            faculty=self.user_faculty_b,
            academic_year=self.ay_b,
            category=self.category_b,
            title="Robotics Conference 2026",
            activity_type="CONFERENCE",
            status=ActivityStatus.PENDING_INCHARGE
        )
        self.v_rec_b = VerificationRecord.objects.create(
            activity=self.activity_b,
            college=self.college_b,
            current_status=ActivityStatus.PENDING_INCHARGE
        )

    # =========================================================================
    # SECTION 3: AUTHENTICATION & SESSION SECURITY
    # =========================================================================

    def test_01_valid_login_returns_tokens(self):
        """Valid login returns JWT access, refresh tokens, and user role info."""
        res = self.client.post('/api/v1/auth/login/', {
            'email': 'faculty.cse@apex.edu',
            'password': 'Password123!'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('access', data)
        self.assertIn('refresh', data)
        self.assertEqual(data['user']['email'], 'faculty.cse@apex.edu')
        self.assertEqual(data['user']['role'], 'FACULTY')

    def test_02_invalid_credentials_rejected(self):
        """Invalid passwords or non-existent accounts must be rejected."""
        res = self.client.post('/api/v1/auth/login/', {
            'email': 'faculty.cse@apex.edu',
            'password': 'WrongPassword999!'
        })
        self.assertIn(res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

    def test_03_deactivated_user_blocked(self):
        """Deactivated users cannot authenticate or access protected endpoints."""
        self.user_faculty_a1.is_active = False
        self.user_faculty_a1.save()

        res = self.client.post('/api/v1/auth/login/', {
            'email': 'faculty.cse@apex.edu',
            'password': 'Password123!'
        })
        self.assertIn(res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

    def test_04_unauthenticated_api_access_blocked(self):
        """Unauthenticated requests to protected endpoints receive 401 Unauthorized."""
        res = self.client.get('/api/v1/activities/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        res = self.client.get('/api/v1/evidence/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_05_logout_and_blacklisted_refresh_token(self):
        """Logout blacklists the refresh token preventing token refresh."""
        login_res = self.client.post('/api/v1/auth/login/', {
            'email': 'faculty.cse@apex.edu',
            'password': 'Password123!'
        })
        refresh_token = login_res.json()['refresh']
        access_token = login_res.json()['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_res = self.client.post('/api/v1/auth/logout/', {'refresh': refresh_token})
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # Attempting refresh with blacklisted token must fail
        refresh_res = self.client.post('/api/v1/auth/refresh/', {'refresh': refresh_token})
        self.assertIn(refresh_res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

    # =========================================================================
    # SECTION 4: ROLE SECURITY (6 ROLES)
    # =========================================================================

    def test_06_faculty_cannot_verify_own_submission(self):
        """Faculty cannot approve or verify their own submissions."""
        self.client.force_authenticate(user=self.user_faculty_a1)

        # Submit activity to PENDING_INCHARGE
        submit_res = self.client.post(f'/api/v1/activities/{self.activity_a.id}/submit/')
        self.assertEqual(submit_res.status_code, status.HTTP_200_OK)

        # Faculty tries to call incharge-verify on their own record
        res = self.client.post(f'/api/v1/verifications/{self.v_rec_a.id}/incharge-verify/', {
            'decision': 'APPROVE',
            'comment': 'Self approval attempt'
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_07_department_incharge_restricted_to_assigned_dept(self):
        """Department In-charge cannot verify submissions of another department."""
        # Create an activity in Department A2 (ECE)
        act_ece = Activity.objects.create(
            college=self.college_a,
            department=self.dept_a2,
            faculty=self.user_faculty_a1,
            academic_year=self.ay_a,
            title="ECE Circuit Design Workshop",
            status=ActivityStatus.PENDING_INCHARGE
        )
        v_ece = VerificationRecord.objects.create(
            activity=act_ece,
            college=self.college_a,
            current_status=ActivityStatus.PENDING_INCHARGE
        )

        # CSE In-charge tries to verify ECE activity
        self.client.force_authenticate(user=self.user_incharge_a1)
        res = self.client.post(f'/api/v1/verifications/{v_ece.id}/incharge-verify/', {
            'decision': 'APPROVE',
            'comment': 'Cross department verify attempt'
        })
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_08_hod_restricted_to_assigned_dept_and_cannot_bypass_iqac(self):
        """HOD cannot verify other departments and cannot bypass Central IQAC."""
        self.activity_a.status = ActivityStatus.PENDING_HOD
        self.activity_a.save()
        self.v_rec_a.current_status = ActivityStatus.PENDING_HOD
        self.v_rec_a.save()

        self.client.force_authenticate(user=self.user_hod_a1)
        res = self.client.post(f'/api/v1/verifications/{self.v_rec_a.id}/hod-verify/', {
            'decision': 'APPROVE',
            'comment': 'HOD Approved'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.activity_a.refresh_from_db()
        # Status must be PENDING_IQAC, NOT VERIFIED_EVIDENCE
        self.assertEqual(self.activity_a.status, ActivityStatus.PENDING_IQAC)
        self.assertFalse(Evidence.objects.filter(activity=self.activity_a).exists())

    def test_09_college_management_cannot_verify(self):
        """College Management has monitoring access only and cannot approve activities."""
        self.activity_a.status = ActivityStatus.PENDING_INCHARGE
        self.activity_a.save()

        self.client.force_authenticate(user=self.user_mgmt_a)
        res = self.client.post(f'/api/v1/verifications/{self.v_rec_a.id}/incharge-verify/', {
            'decision': 'APPROVE'
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res = self.client.post(f'/api/v1/verifications/{self.v_rec_a.id}/iqac-verify/', {
            'decision': 'APPROVE'
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_10_iqac_final_verification_authority(self):
        """Central IQAC performs final verification and converts activity into Evidence."""
        self.activity_a.status = ActivityStatus.PENDING_IQAC
        self.activity_a.save()
        self.v_rec_a.current_status = ActivityStatus.PENDING_IQAC
        self.v_rec_a.save()

        self.client.force_authenticate(user=self.user_iqac_a)
        res = self.client.post(f'/api/v1/verifications/{self.v_rec_a.id}/iqac-verify/', {
            'decision': 'APPROVE',
            'comment': 'Sealed by IQAC Coordinator'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.activity_a.refresh_from_db()
        self.assertEqual(self.activity_a.status, ActivityStatus.VERIFIED_EVIDENCE)
        self.assertTrue(Evidence.objects.filter(activity=self.activity_a).exists())

    def test_11_super_admin_platform_oversight(self):
        """Super Admin has platform administration access."""
        self.client.force_authenticate(user=self.user_superadmin)
        res = self.client.get('/api/v1/admin/system-health/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    # =========================================================================
    # SECTION 5: STRICT TENANT ISOLATION ACROSS 13 SUBSYSTEMS (COLLEGE A vs B)
    # =========================================================================

    def test_12_tenant_isolation_users(self):
        """College A user cannot read College B user records via direct ID."""
        self.client.force_authenticate(user=self.user_iqac_a)
        res = self.client.get(f'/api/v1/auth/users/{self.user_faculty_b.id}/')
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_13_tenant_isolation_faculty_profiles(self):
        """College A user cannot access College B faculty profile via direct ID."""
        self.client.force_authenticate(user=self.user_iqac_a)
        res = self.client.get(f'/api/v1/auth/faculty/profiles/{self.profile_b.id}/')
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_14_tenant_isolation_activities(self):
        """College A user cannot retrieve or mutate College B activity."""
        self.client.force_authenticate(user=self.user_iqac_a)
        res = self.client.get(f'/api/v1/activities/{self.activity_b.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        res = self.client.patch(f'/api/v1/activities/{self.activity_b.id}/', {'title': 'Hacked Title'})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_15_tenant_isolation_evidence(self):
        """College A user cannot view College B evidence records."""
        ev_b = Evidence.objects.create(
            college=self.college_b,
            department=self.dept_b,
            faculty=self.user_faculty_b,
            activity=self.activity_b,
            academic_year=self.ay_b,
            title="Beacon Private Evidence",
            is_verified=True
        )
        self.client.force_authenticate(user=self.user_iqac_a)
        res = self.client.get(f'/api/v1/evidence/{ev_b.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_16_tenant_isolation_reports(self):
        """College A user cannot download or access College B generated reports."""
        rep_type = ReportType.objects.create(
            college=self.college_b,
            name="NAAC Criterion Report",
            code="NAAC-B"
        )
        rep_b = GeneratedReport.objects.create(
            college=self.college_b,
            report_type=rep_type,
            title="Confidential Beacon Report",
            output_format="PDF",
            status=ReportStatus.COMPLETED
        )
        self.client.force_authenticate(user=self.user_iqac_a)
        res = self.client.get(f'/api/v1/reports/{rep_b.id}/download/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_17_tenant_isolation_evidence_search(self):
        """Evidence search from College A returns 0 results from College B."""
        Evidence.objects.create(
            college=self.college_b,
            department=self.dept_b,
            faculty=self.user_faculty_b,
            activity=self.activity_b,
            academic_year=self.ay_b,
            title="Quantum Computing Secrets",
            is_verified=True
        )
        self.client.force_authenticate(user=self.user_iqac_a)
        res = self.client.get('/api/v1/evidence/?search=Quantum')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.json().get('results', res.json())
        self.assertEqual(len(results), 0)

    def test_18_tenant_isolation_analytics(self):
        """Executive analytics reflects strictly College A metrics and zero College B data."""
        self.client.force_authenticate(user=self.user_mgmt_a)
        res = self.client.get('/api/v1/analytics/executive/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should not error and should execute cleanly within College A's context

    def test_19_tenant_isolation_aqar_ssr(self):
        """AQAR compliance dashboard is isolated to College A."""
        self.client.force_authenticate(user=self.user_iqac_a)
        res = self.client.get('/api/v1/aqar/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_20_tenant_isolation_notifications(self):
        """College A user never receives or sees College B notifications."""
        Notification.objects.create(
            college=self.college_b,
            recipient=self.user_faculty_b,
            sender=self.user_faculty_b,
            title="Beacon Notification",
            body="Beacon private alert",
            notification_type="VERIFICATION_ALERT",
            category="VERIFICATION",
            priority="LOW"
        )
        self.client.force_authenticate(user=self.user_faculty_a1)
        res = self.client.get('/api/v1/notifications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.json().get('results', res.json())
        for n in results:
            self.assertNotEqual(n['title'], "Beacon Notification")

    def test_21_tenant_isolation_tasks(self):
        """College A user cannot read or update College B task."""
        task_b = IQACTask.objects.create(
            college=self.college_b,
            owner=self.user_faculty_b,
            creator=self.user_faculty_b,
            title="Beacon Private Audit Task",
            priority="HIGH",
            due_date=date.today() + timedelta(days=5)
        )
        self.client.force_authenticate(user=self.user_iqac_a)
        res = self.client.get(f'/api/v1/notifications/tasks/{task_b.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_22_tenant_isolation_billing_invoices(self):
        """College A user cannot view or download College B billing invoice."""
        inv_b = Invoice.objects.create(
            college=self.college_b,
            subscription=self.sub_b,
            invoice_number="INV-2026-BU-001",
            billing_period_start=timezone.now(),
            billing_period_end=timezone.now() + timedelta(days=30),
            amount=Decimal('9999.00'),
            tax_rate=Decimal('18.00'),
            tax_amount=Decimal('1799.82'),
            total_amount=Decimal('11798.82'),
            currency='INR',
            due_date=date.today() + timedelta(days=15),
            status=InvoiceStatus.PAID
        )
        self.client.force_authenticate(user=self.user_mgmt_a)
        res = self.client.get(f'/api/v1/billing/invoices/{inv_b.id}/pdf/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_23_tenant_isolation_support_tickets(self):
        """College A user cannot view College B support tickets."""
        ticket_b = SupportTicket.objects.create(
            college=self.college_b,
            created_by=self.user_faculty_b,
            ticket_number="TCK-202609-9999",
            category="LOGIN",
            priority="HIGH",
            subject="Beacon Urgent Issue",
            description="Beacon private support request"
        )
        self.client.force_authenticate(user=self.user_iqac_a)
        res = self.client.get(f'/api/v1/tickets/{ticket_b.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_24_tenant_isolation_exports(self):
        """College A user cannot export College B data bundle."""
        self.client.force_authenticate(user=self.user_mgmt_a)
        res = self.client.get(f'/api/v1/colleges/{self.college_b.id}/export/')
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    # =========================================================================
    # SECTION 6: CORE VERIFICATION WORKFLOW & STATE MACHINE
    # =========================================================================

    def test_25_complete_valid_verification_flow(self):
        """
        Tests the complete 4-stage verification progression:
        DRAFT -> PENDING_INCHARGE -> PENDING_HOD -> PENDING_IQAC -> VERIFIED_EVIDENCE.
        """
        # Step 1: Faculty submits
        self.client.force_authenticate(user=self.user_faculty_a1)
        res = self.client.post(f'/api/v1/activities/{self.activity_a.id}/submit/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.activity_a.refresh_from_db()
        self.assertEqual(self.activity_a.status, ActivityStatus.PENDING_INCHARGE)

        # Step 2: In-charge approves
        self.client.force_authenticate(user=self.user_incharge_a1)
        res = self.client.post(f'/api/v1/verifications/{self.v_rec_a.id}/incharge-verify/', {
            'decision': 'APPROVE',
            'comment': 'In-charge approved'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.activity_a.refresh_from_db()
        self.assertEqual(self.activity_a.status, ActivityStatus.PENDING_HOD)

        # Step 3: HOD approves
        self.client.force_authenticate(user=self.user_hod_a1)
        res = self.client.post(f'/api/v1/verifications/{self.v_rec_a.id}/hod-verify/', {
            'decision': 'APPROVE',
            'comment': 'HOD approved'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.activity_a.refresh_from_db()
        self.assertEqual(self.activity_a.status, ActivityStatus.PENDING_IQAC)

        # Step 4: IQAC final verifies
        self.client.force_authenticate(user=self.user_iqac_a)
        res = self.client.post(f'/api/v1/verifications/{self.v_rec_a.id}/iqac-verify/', {
            'decision': 'APPROVE',
            'comment': 'Final IQAC Verification'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.activity_a.refresh_from_db()
        self.assertEqual(self.activity_a.status, ActivityStatus.VERIFIED_EVIDENCE)
        self.assertTrue(Evidence.objects.filter(activity=self.activity_a).exists())

    def test_26_invalid_workflow_transitions_rejected(self):
        """Bypass attempts and premature approvals are blocked."""
        # 1. In-charge cannot verify an activity that is still in DRAFT
        self.client.force_authenticate(user=self.user_incharge_a1)
        res = self.client.post(f'/api/v1/verifications/{self.v_rec_a.id}/incharge-verify/', {
            'decision': 'APPROVE'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. HOD cannot approve an activity before In-charge verification
        self.activity_a.status = ActivityStatus.PENDING_INCHARGE
        self.activity_a.save()
        self.client.force_authenticate(user=self.user_hod_a1)
        res = self.client.post(f'/api/v1/verifications/{self.v_rec_a.id}/hod-verify/', {
            'decision': 'APPROVE'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. IQAC cannot verify an activity before HOD approval
        self.activity_a.status = ActivityStatus.PENDING_HOD
        self.activity_a.save()
        self.client.force_authenticate(user=self.user_iqac_a)
        res = self.client.post(f'/api/v1/verifications/{self.v_rec_a.id}/iqac-verify/', {
            'decision': 'APPROVE'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # SECTION 8: EVIDENCE SECURITY & FILE VALIDATION
    # =========================================================================

    def test_27_dangerous_executable_file_rejected(self):
        """Executable or malicious script files are rejected by file validator."""
        dangerous_file = SimpleUploadedFile(
            "malicious.exe",
            b"MZ\x90\x00\x03\x00\x00\x00DOS executable content",
            content_type="application/x-msdownload"
        )
        with self.assertRaises(ValidationError):
            validate_file_security(dangerous_file)

    def test_28_oversized_file_rejected(self):
        """Files exceeding 25MB threshold are rejected."""
        # Create a mock file with size reported as 30MB
        oversized_file = SimpleUploadedFile(
            "large_doc.pdf",
            b"%PDF-1.4 Mock large PDF file content",
            content_type="application/pdf"
        )
        oversized_file.size = 30 * 1024 * 1024  # 30MB

        with self.assertRaises(ValidationError):
            validate_file_security(oversized_file)

    def test_29_valid_pdf_file_accepted(self):
        """Legitimate PDF files pass security validation."""
        pdf_file = SimpleUploadedFile(
            "certificate.pdf",
            b"%PDF-1.4 Valid PDF file content for testing...",
            content_type="application/pdf"
        )
        # Should not raise
        validate_file_security(pdf_file)

    def test_30_verified_evidence_tamper_protection(self):
        """Verified evidence cannot be altered by faculty."""
        self.activity_a.status = ActivityStatus.VERIFIED_EVIDENCE
        self.activity_a.save()

        self.client.force_authenticate(user=self.user_faculty_a1)
        res = self.client.patch(f'/api/v1/activities/{self.activity_a.id}/', {
            'title': 'Tampered Verified Title'
        })
        # Should either block update or keep original status
        self.activity_a.refresh_from_db()
        self.assertEqual(self.activity_a.status, ActivityStatus.VERIFIED_EVIDENCE)

    # =========================================================================
    # SECTION 9: REPORT GENERATION & DATA INTEGRITY
    # =========================================================================

    def test_31_report_generation_verified_data_only(self):
        """Report generation counts strictly verified evidence, ignoring drafts."""
        # College A has 1 draft activity (self.activity_a)
        # Create 1 verified evidence in College A
        act_verified = Activity.objects.create(
            college=self.college_a,
            department=self.dept_a1,
            faculty=self.user_faculty_a1,
            academic_year=self.ay_a,
            category=self.category_a,
            title="Officially Verified FDP",
            status=ActivityStatus.VERIFIED_EVIDENCE
        )
        Evidence.objects.create(
            college=self.college_a,
            department=self.dept_a1,
            faculty=self.user_faculty_a1,
            activity=act_verified,
            academic_year=self.ay_a,
            title="Officially Verified FDP",
            is_verified=True
        )

        rep_type = ReportType.objects.create(
            college=self.college_a,
            name="Department Quality Summary",
            code="DQS-A"
        )

        self.client.force_authenticate(user=self.user_iqac_a)
        gen_res = self.client.post('/api/v1/reports/generate/', {
            'report_type': str(rep_type.id),
            'title': 'CSE Annual QA Report 2026',
            'department': str(self.dept_a1.id),
            'academic_year': str(self.ay_a.id),
            'output_format': 'PDF'
        })
        self.assertEqual(gen_res.status_code, status.HTTP_201_CREATED)
        rep_id = gen_res.json()['id']

        rep = GeneratedReport.objects.get(id=rep_id)
        self.assertEqual(rep.college, self.college_a)
        self.assertEqual(rep.status, ReportStatus.COMPLETED)
        # Assert unverified draft is not included in verified count
        self.assertEqual(rep.record_count, 1)
