"""
End-to-end data propagation and tenant accuracy tests:
Faculty Upload -> Database -> Verification Workflow -> Verified Evidence ->
Department -> HOD -> IQAC Coordinator -> College Management -> Reports / Statistics
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.colleges.models import College
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.accounts.models import FacultyProfile, UserRole
from apps.activities.models import Activity, ActivityType, ActivityStatus, Document
from apps.verification.models import VerificationRecord
from apps.evidence.models import Evidence
from apps.notifications.models import Notification, NotificationCategory
from apps.reports.models import GeneratedReport, ReportType, ReportFormat, ReportStatus

User = get_user_model()


class DataPropagationAndAccuracyTestCase(TestCase):
    def setUp(self):
        # -------------------------------------------------------------
        # COLLEGE A (Primary Institution)
        # -------------------------------------------------------------
        self.college_a = College.objects.create(
            name="Apex Institute of Technology",
            code="APEX",
            is_active=True
        )
        self.ay_a = AcademicYear.objects.create(
            college=self.college_a,
            name="2024-2025",
            start_date="2024-06-01",
            end_date="2025-05-31",
            is_current=True,
            is_active=True
        )
        self.dept_cse_a = Department.objects.create(
            college=self.college_a,
            name="Computer Science and Engineering",
            code="CSE"
        )
        self.dept_ece_a = Department.objects.create(
            college=self.college_a,
            name="Electronics and Communication Engineering",
            code="ECE"
        )

        # College A Users
        self.faculty_a = User.objects.create_user(
            email="faculty.cse@apex.edu", password="password123",
            role=UserRole.FACULTY, college=self.college_a, department=self.dept_cse_a,
            first_name="Anita", last_name="Sharma", employee_id="FAC-CSE-01"
        )
        FacultyProfile.objects.create(
            user=self.faculty_a, college=self.college_a, department=self.dept_cse_a,
            employee_id="FAC-CSE-01", designation="Assistant Professor",
            qualification="Ph.D.", experience_years=7
        )

        self.incharge_cse_a = User.objects.create_user(
            email="incharge.cse@apex.edu", password="password123",
            role=UserRole.DEPARTMENT_INCHARGE, college=self.college_a, department=self.dept_cse_a,
            first_name="Ravi", last_name="Varma", employee_id="INC-CSE-01"
        )

        self.incharge_ece_a = User.objects.create_user(
            email="incharge.ece@apex.edu", password="password123",
            role=UserRole.DEPARTMENT_INCHARGE, college=self.college_a, department=self.dept_ece_a,
            first_name="Sunil", last_name="Pillai", employee_id="INC-ECE-01"
        )

        self.hod_cse_a = User.objects.create_user(
            email="hod.cse@apex.edu", password="password123",
            role=UserRole.HOD, college=self.college_a, department=self.dept_cse_a,
            first_name="Kavita", last_name="Deshmukh", employee_id="HOD-CSE-01"
        )

        self.iqac_a = User.objects.create_user(
            email="iqac@apex.edu", password="password123",
            role=UserRole.IQAC, college=self.college_a,
            first_name="Suresh", last_name="Rao", employee_id="IQAC-01"
        )

        self.management_a = User.objects.create_user(
            email="management@apex.edu", password="password123",
            role=UserRole.COLLEGE_MANAGEMENT, college=self.college_a,
            first_name="Deepak", last_name="Singhania", employee_id="MGMT-01"
        )

        # -------------------------------------------------------------
        # COLLEGE B (Secondary / Separate Tenant)
        # -------------------------------------------------------------
        self.college_b = College.objects.create(
            name="Beacon Engineering College",
            code="BEACON",
            is_active=True
        )
        self.dept_cse_b = Department.objects.create(
            college=self.college_b,
            name="Computer Science",
            code="CS"
        )

        self.faculty_b = User.objects.create_user(
            email="faculty@beacon.edu", password="password123",
            role=UserRole.FACULTY, college=self.college_b, department=self.dept_cse_b,
            first_name="Vikram", last_name="Patel"
        )
        self.hod_b = User.objects.create_user(
            email="hod@beacon.edu", password="password123",
            role=UserRole.HOD, college=self.college_b, department=self.dept_cse_b,
            first_name="Meera", last_name="Nair"
        )
        self.iqac_b = User.objects.create_user(
            email="iqac@beacon.edu", password="password123",
            role=UserRole.IQAC, college=self.college_b,
            first_name="Arun", last_name="Kumar"
        )
        self.management_b = User.objects.create_user(
            email="management@beacon.edu", password="password123",
            role=UserRole.COLLEGE_MANAGEMENT, college=self.college_b,
            first_name="Prakash", last_name="Goel"
        )

    def test_01_faculty_upload_and_metadata_preservation(self):
        """
        Step 1: Faculty uploads an FDP record and attaches a document.
        Verify correct college, department, faculty, academic year, and initial DRAFT status.
        """
        client = APIClient()
        client.force_authenticate(user=self.faculty_a)

        # 1. Create FDP activity
        resp = client.post('/api/v1/activities/', {
            'title': 'Advanced Deep Learning and Transformers FDP',
            'activity_type': 'FDP',
            'organizer': 'IIT Bombay & AICTE',
            'start_date': '2024-07-10',
            'certificate_number': 'IITB-FDP-9988',
            'description': '1-week intensive FDP on Deep Learning models.'
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        activity_id = resp.data['id']

        activity = Activity.objects.get(id=activity_id)
        self.assertEqual(activity.college, self.college_a)
        self.assertEqual(activity.department, self.dept_cse_a)
        self.assertEqual(activity.faculty, self.faculty_a)
        self.assertEqual(activity.academic_year, self.ay_a)
        self.assertEqual(activity.activity_type, ActivityType.FDP)
        self.assertEqual(activity.status, ActivityStatus.DRAFT)
        self.assertFalse(activity.is_verified)

        # 2. Upload and attach document
        dummy_file = SimpleUploadedFile("fdp_certificate.pdf", b"%PDF-1.4 dummy cert content", content_type="application/pdf")
        doc_resp = client.post('/api/v1/documents/', {
            'activity': activity_id,
            'file': dummy_file,
            'file_name': 'fdp_certificate.pdf',
            'file_size': '24',
            'mime_type': 'application/pdf',
            'document_type': 'CERTIFICATE',
            'is_primary': 'true'
        }, format='multipart')
        self.assertEqual(doc_resp.status_code, status.HTTP_201_CREATED)

        # Verify document association
        doc = Document.objects.get(id=doc_resp.data['id'])
        self.assertEqual(doc.activity, activity)
        self.assertEqual(doc.uploaded_by, self.faculty_a)
        self.assertEqual(doc.college, self.college_a)

    def test_02_multi_tenant_and_department_isolation(self):
        """
        Step 2: Tenant & Department Isolation.
        - College B users cannot access College A activities.
        - ECE Incharge cannot access CSE activities in verification queue.
        """
        # Create an activity for College A Faculty
        activity = Activity.objects.create(
            college=self.college_a, department=self.dept_cse_a, faculty=self.faculty_a,
            academic_year=self.ay_a, activity_type=ActivityType.PUBLICATION,
            title='Autonomous Neural Architecture Search', status=ActivityStatus.PENDING_INCHARGE
        )
        VerificationRecord.objects.create(
            college=self.college_a, activity=activity, current_status=ActivityStatus.PENDING_INCHARGE
        )

        # Test Tenant Isolation (College B faculty/HOD)
        client_b = APIClient()
        client_b.force_authenticate(user=self.faculty_b)
        resp_b = client_b.get(f'/api/v1/activities/{activity.id}/')
        self.assertEqual(resp_b.status_code, status.HTTP_404_NOT_FOUND)

        client_hod_b = APIClient()
        client_hod_b.force_authenticate(user=self.hod_b)
        resp_hod_b = client_hod_b.get(f'/api/v1/activities/{activity.id}/')
        self.assertEqual(resp_hod_b.status_code, status.HTTP_404_NOT_FOUND)

        # Test Department Isolation (ECE Incharge in College A)
        client_ece = APIClient()
        client_ece.force_authenticate(user=self.incharge_ece_a)
        resp_ece = client_ece.get('/api/v1/verifications/')
        self.assertEqual(resp_ece.status_code, status.HTTP_200_OK)
        ids = [item['activity']['id'] if isinstance(item.get('activity'), dict) else item.get('activity') for item in resp_ece.data.get('results', [])]
        self.assertNotIn(str(activity.id), ids)

    def test_03_strict_verification_workflow_and_evidence(self):
        """
        Step 3: Verification Tier Hierarchy:
        Faculty Submit -> Pending Incharge -> Incharge Verify -> Pending HOD ->
        HOD Approve -> Pending IQAC -> IQAC Verify -> Verified Evidence.
        Verify Evidence object auto-created.
        """
        activity = Activity.objects.create(
            college=self.college_a, department=self.dept_cse_a, faculty=self.faculty_a,
            academic_year=self.ay_a, activity_type=ActivityType.FDP,
            title='Cloud Infrastructure & DevOps FDP', status=ActivityStatus.DRAFT
        )
        rec, _ = VerificationRecord.objects.get_or_create(
            college=self.college_a, activity=activity, defaults={'current_status': ActivityStatus.DRAFT}
        )

        # 1. Faculty Submits for Verification (POST /api/v1/activities/{id}/submit/)
        client = APIClient()
        client.force_authenticate(user=self.faculty_a)
        sub_resp = client.post(f'/api/v1/activities/{activity.id}/submit/')
        self.assertEqual(sub_resp.status_code, status.HTTP_200_OK)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.PENDING_INCHARGE)

        # 2. In-charge Verifies
        client.force_authenticate(user=self.incharge_cse_a)
        inc_resp = client.post(f'/api/v1/verifications/{rec.id}/incharge-verify/', {
            'decision': 'APPROVE',
            'comment': 'All documents and certificates verified.'
        })
        self.assertEqual(inc_resp.status_code, status.HTTP_200_OK)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.PENDING_HOD)

        # 3. HOD Approves
        client.force_authenticate(user=self.hod_cse_a)
        hod_resp = client.post(f'/api/v1/verifications/{rec.id}/hod-verify/', {
            'decision': 'APPROVE',
            'comment': 'Approved by Head of Department.'
        })
        self.assertEqual(hod_resp.status_code, status.HTTP_200_OK)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.PENDING_IQAC)

        # 4. IQAC Verifies -> Moves to VERIFIED_EVIDENCE
        client.force_authenticate(user=self.iqac_a)
        iqac_resp = client.post(f'/api/v1/verifications/{rec.id}/iqac-verify/', {
            'decision': 'APPROVE',
            'comment': 'Official IQAC verification completed.'
        })
        self.assertEqual(iqac_resp.status_code, status.HTTP_200_OK)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.VERIFIED_EVIDENCE)
        self.assertTrue(activity.is_verified)

        # 5. Check auto-created Evidence item
        evidence_exists = Evidence.objects.filter(
            college=self.college_a, activity=activity, is_verified=True
        ).exists()
        self.assertTrue(evidence_exists)

    def test_04_hod_submit_to_admins_targeted_notifications(self):
        """
        Step 4: HOD submits a report using Submit to Admins.
        Verify:
        - Automatically creates notifications for College Management (Admin1) and IQAC (Admin2) of College A.
        - Structured metadata contains: department_name, department_code, hod_name, report_title, submitted_at, report_status='SUBMITTED', action_url, action_label.
        - College B receives 0 notifications.
        - Other roles (faculty, unrelated incharge) receive 0 notifications.
        """
        rt, _ = ReportType.objects.get_or_create(
            code="DEPARTMENT_SUMMARY",
            defaults={"name": "Department Summary Report", "default_format": ReportFormat.PDF}
        )

        # Create a report for College A HOD
        report = GeneratedReport.objects.create(
            college=self.college_a,
            department=self.dept_cse_a,
            academic_year=self.ay_a,
            generated_by=self.hod_cse_a,
            report_type=rt,
            title="CSE Department Annual Quality Assurance Report 2024-25",
            status=ReportStatus.COMPLETED,
            output_format=ReportFormat.PDF,
            record_count=12
        )

        client = APIClient()
        client.force_authenticate(user=self.hod_cse_a)

        # Submit report to Admins
        resp = client.post(f'/api/v1/reports/{report.id}/submit-to-admins/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data.get('status'), 'success')
        self.assertEqual(resp.data.get('recipients_count'), 2)

        # Check College Management A notifications
        mgmt_notifs = Notification.objects.filter(
            recipient=self.management_a,
            notification_type='HOD_ADMIN_REPORT_SUBMISSION'
        )
        self.assertEqual(mgmt_notifs.count(), 1)
        mgmt_notif = mgmt_notifs.first()
        self.assertEqual(mgmt_notif.category, NotificationCategory.REPORT)
        self.assertEqual(mgmt_notif.metadata.get('department_name'), 'Computer Science and Engineering')
        self.assertEqual(mgmt_notif.metadata.get('department_code'), 'CSE')
        self.assertEqual(mgmt_notif.metadata.get('hod_name'), 'Kavita Deshmukh')
        self.assertEqual(mgmt_notif.metadata.get('report_title'), report.title)
        self.assertEqual(mgmt_notif.metadata.get('report_status'), 'SUBMITTED')
        self.assertEqual(mgmt_notif.action_url, f'/api/v1/reports/{report.id}/download/')
        self.assertEqual(mgmt_notif.action_label, 'View / Download Report')
        self.assertFalse(mgmt_notif.is_read)

        # Check IQAC A notifications
        iqac_notifs = Notification.objects.filter(
            recipient=self.iqac_a,
            notification_type='HOD_ADMIN_REPORT_SUBMISSION'
        )
        self.assertEqual(iqac_notifs.count(), 1)
        iqac_notif = iqac_notifs.first()
        self.assertEqual(iqac_notif.metadata.get('department_name'), 'Computer Science and Engineering')
        self.assertEqual(iqac_notif.metadata.get('report_title'), report.title)

        # Check College B received NO notifications
        college_b_notifs = Notification.objects.filter(
            college=self.college_b,
            notification_type='HOD_ADMIN_REPORT_SUBMISSION'
        )
        self.assertEqual(college_b_notifs.count(), 0)

        mgmt_b_notifs = Notification.objects.filter(
            recipient=self.management_b,
            notification_type='HOD_ADMIN_REPORT_SUBMISSION'
        )
        self.assertEqual(mgmt_b_notifs.count(), 0)

        # Check Faculty A received NO submission notifications
        fac_notifs = Notification.objects.filter(
            recipient=self.faculty_a,
            notification_type='HOD_ADMIN_REPORT_SUBMISSION'
        )
        self.assertEqual(fac_notifs.count(), 0)
