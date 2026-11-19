import datetime
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.colleges.models import College
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.accounts.models import User, UserRole
from apps.activities.models import Activity, ActivityCategory, Document, ActivityStatus
from apps.verification.models import VerificationRecord, VerificationAction
from apps.evidence.models import Evidence


class Phase3WorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # College A & College B
        self.college_a = College.objects.create(name='College A', code='COL-A', is_active=True)
        self.college_b = College.objects.create(name='College B', code='COL-B', is_active=True)

        # Departments in College A
        self.dept_cse = Department.objects.create(college=self.college_a, name='Computer Science', code='CSE', is_active=True)
        self.dept_it = Department.objects.create(college=self.college_a, name='Information Technology', code='IT', is_active=True)

        # Department in College B
        self.dept_b = Department.objects.create(college=self.college_b, name='CSE College B', code='CSE-B', is_active=True)

        # Academic Year
        self.ay = AcademicYear.objects.create(
            college=self.college_a, name='2024-25',
            start_date=datetime.date(2024, 7, 1), end_date=datetime.date(2025, 6, 30),
            is_active=True, is_current=True
        )

        # Activity Category
        self.cat_fdp = ActivityCategory.objects.create(name='Faculty Development Program', code='FDP', is_active=True)

        # Users in College A
        self.faculty_1 = User.objects.create(
            email='faculty1@col-a.edu', college=self.college_a, department=self.dept_cse,
            role=UserRole.FACULTY, first_name='Faculty', last_name='One', is_active=True
        )
        self.faculty_1.set_password('pass123')
        self.faculty_1.save()

        self.faculty_2 = User.objects.create(
            email='faculty2@col-a.edu', college=self.college_a, department=self.dept_cse,
            role=UserRole.FACULTY, first_name='Faculty', last_name='Two', is_active=True
        )
        self.faculty_2.set_password('pass123')
        self.faculty_2.save()

        self.incharge_cse = User.objects.create(
            email='incharge@col-a.edu', college=self.college_a, department=self.dept_cse,
            role=UserRole.DEPARTMENT_INCHARGE, first_name='Incharge', last_name='CSE', is_active=True
        )
        self.incharge_cse.set_password('pass123')
        self.incharge_cse.save()

        self.hod_cse = User.objects.create(
            email='hod@col-a.edu', college=self.college_a, department=self.dept_cse,
            role=UserRole.HOD, first_name='HOD', last_name='CSE', is_active=True
        )
        self.hod_cse.set_password('pass123')
        self.hod_cse.save()

        self.hod_it = User.objects.create(
            email='hod.it@col-a.edu', college=self.college_a, department=self.dept_it,
            role=UserRole.HOD, first_name='HOD', last_name='IT', is_active=True
        )
        self.hod_it.set_password('pass123')
        self.hod_it.save()

        self.iqac_user = User.objects.create(
            email='iqac@col-a.edu', college=self.college_a,
            role=UserRole.IQAC, first_name='IQAC', last_name='Director', is_active=True
        )
        self.iqac_user.set_password('pass123')
        self.iqac_user.save()

        # User in College B
        self.faculty_b = User.objects.create(
            email='faculty@col-b.edu', college=self.college_b, department=self.dept_b,
            role=UserRole.FACULTY, first_name='Faculty', last_name='B', is_active=True
        )
        self.faculty_b.set_password('pass123')
        self.faculty_b.save()

    def test_01_faculty_creates_draft_and_uploads_certificate(self):
        """Test 1: Faculty creates activity draft and uploads certificate document."""
        self.client.force_authenticate(user=self.faculty_1)
        res = self.client.post('/api/activities/', {
            'title': 'AI Bootcamp 2024',
            'category': str(self.cat_fdp.id),
            'academic_year': str(self.ay.id),
            'organizer': 'IIT Bombay',
            'start_date': '2024-09-01',
            'end_date': '2024-09-05',
            'duration': '5 Days',
            'description': 'Deep learning workshop',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        activity_id = res.data['id']
        self.assertEqual(res.data['status'], ActivityStatus.DRAFT)
        self.assertTrue(res.data['is_editable'])

        # Upload certificate
        test_file = SimpleUploadedFile("cert.pdf", b"%PDF-1.4 sample content", content_type="application/pdf")
        doc_res = self.client.post('/api/documents/', {
            'activity': activity_id,
            'file': test_file,
            'file_name': 'Certificate of Completion',
            'document_type': 'CERTIFICATE',
            'is_primary': True,
        }, format='multipart')
        self.assertEqual(doc_res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(len(doc_res.data['file_hash']) > 0)

    def test_02_faculty_submits_for_verification(self):
        """Test 2: Faculty submits draft -> transitions to PENDING_INCHARGE."""
        activity = Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_1,
            academic_year=self.ay, category=self.cat_fdp, title='Machine Learning FDP',
            status=ActivityStatus.DRAFT
        )
        VerificationRecord.objects.create(activity=activity, college=self.college_a, current_status=ActivityStatus.DRAFT)

        self.client.force_authenticate(user=self.faculty_1)
        res = self.client.post(f'/api/activities/{activity.id}/submit/', {'comment': 'Ready for review'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.PENDING_INCHARGE)

    def test_03_incharge_approves_and_forwards_to_hod(self):
        """Test 3: In-charge approves -> transitions to PENDING_HOD."""
        activity = Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_1,
            academic_year=self.ay, category=self.cat_fdp, title='Cybersecurity Training',
            status=ActivityStatus.PENDING_INCHARGE
        )
        rec = VerificationRecord.objects.create(activity=activity, college=self.college_a, current_status=ActivityStatus.PENDING_INCHARGE)

        self.client.force_authenticate(user=self.incharge_cse)
        res = self.client.post(f'/api/verifications/{rec.id}/incharge-verify/', {
            'decision': 'APPROVE',
            'comment': 'Document matches all criteria.'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.PENDING_HOD)

    def test_04_hod_approves_and_forwards_to_iqac(self):
        """Test 4: HOD approves -> transitions to PENDING_IQAC."""
        activity = Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_1,
            academic_year=self.ay, category=self.cat_fdp, title='Cloud Architecture Workshop',
            status=ActivityStatus.PENDING_HOD
        )
        rec = VerificationRecord.objects.create(activity=activity, college=self.college_a, current_status=ActivityStatus.PENDING_HOD)

        self.client.force_authenticate(user=self.hod_cse)
        res = self.client.post(f'/api/verifications/{rec.id}/hod-verify/', {
            'decision': 'APPROVE',
            'comment': 'Approved by HOD.'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.PENDING_IQAC)

    def test_05_iqac_final_approval_seals_evidence(self):
        """Test 5: IQAC approves -> transitions to VERIFIED_EVIDENCE and seals Evidence record."""
        activity = Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_1,
            academic_year=self.ay, category=self.cat_fdp, title='International Research Symposium',
            status=ActivityStatus.PENDING_IQAC
        )
        rec = VerificationRecord.objects.create(activity=activity, college=self.college_a, current_status=ActivityStatus.PENDING_IQAC)

        self.client.force_authenticate(user=self.iqac_user)
        res = self.client.post(f'/api/verifications/{rec.id}/iqac-verify/', {
            'decision': 'APPROVE',
            'comment': 'Final IQAC verification complete. Valid for NAAC criteria.'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.VERIFIED_EVIDENCE)
        self.assertTrue(Evidence.objects.filter(activity=activity, is_verified=True).exists())

    def test_06_incharge_rejects_returns_to_faculty(self):
        """Test 6: In-charge rejects with reason -> transitions to RETURNED_TO_FACULTY."""
        activity = Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_1,
            academic_year=self.ay, category=self.cat_fdp, title='Faulty Submission',
            status=ActivityStatus.PENDING_INCHARGE
        )
        rec = VerificationRecord.objects.create(activity=activity, college=self.college_a, current_status=ActivityStatus.PENDING_INCHARGE)

        self.client.force_authenticate(user=self.incharge_cse)
        res = self.client.post(f'/api/verifications/{rec.id}/incharge-verify/', {
            'decision': 'REJECT',
            'comment': 'Certificate dates do not match activity start/end dates.'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.RETURNED_TO_FACULTY)
        self.assertTrue(activity.is_editable)

        # Faculty can now update and resubmit
        self.client.force_authenticate(user=self.faculty_1)
        patch_res = self.client.patch(f'/api/activities/{activity.id}/', {'start_date': '2024-09-02'})
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)

        resubmit_res = self.client.post(f'/api/activities/{activity.id}/submit/', {'comment': 'Fixed date.'})
        self.assertEqual(resubmit_res.status_code, status.HTTP_200_OK)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.PENDING_INCHARGE)

    def test_07_hod_rejects_returns_to_incharge(self):
        """Test 7: HOD rejects with reason -> transitions to RETURNED_TO_INCHARGE."""
        activity = Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_1,
            academic_year=self.ay, category=self.cat_fdp, title='Pending HOD Workshop',
            status=ActivityStatus.PENDING_HOD
        )
        rec = VerificationRecord.objects.create(activity=activity, college=self.college_a, current_status=ActivityStatus.PENDING_HOD)

        self.client.force_authenticate(user=self.hod_cse)
        res = self.client.post(f'/api/verifications/{rec.id}/hod-verify/', {
            'decision': 'REJECT',
            'comment': 'Requires in-charge to re-check certificate registration ID.'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.RETURNED_TO_INCHARGE)

    def test_08_unauthorized_user_cannot_verify(self):
        """Test 8: Faculty trying to call incharge_verify receives 403 Forbidden."""
        activity = Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_1,
            academic_year=self.ay, category=self.cat_fdp, title='Test Activity',
            status=ActivityStatus.PENDING_INCHARGE
        )
        rec = VerificationRecord.objects.create(activity=activity, college=self.college_a, current_status=ActivityStatus.PENDING_INCHARGE)

        self.client.force_authenticate(user=self.faculty_1)
        res = self.client.post(f'/api/verifications/{rec.id}/incharge-verify/', {'decision': 'APPROVE'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_09_faculty_cannot_access_other_faculty_draft(self):
        """Test 9: Faculty A cannot view or edit Faculty B draft."""
        activity = Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_1,
            academic_year=self.ay, category=self.cat_fdp, title='Faculty 1 Secret Draft',
            status=ActivityStatus.DRAFT
        )
        self.client.force_authenticate(user=self.faculty_2)
        res = self.client.get(f'/api/activities/{activity.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_10_hod_cannot_access_other_department(self):
        """Test 10: HOD of IT cannot verify CSE department submission."""
        activity = Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_1,
            academic_year=self.ay, category=self.cat_fdp, title='CSE Conference',
            status=ActivityStatus.PENDING_HOD
        )
        rec = VerificationRecord.objects.create(activity=activity, college=self.college_a, current_status=ActivityStatus.PENDING_HOD)

        self.client.force_authenticate(user=self.hod_it)
        res = self.client.post(f'/api/verifications/{rec.id}/hod-verify/', {'decision': 'APPROVE'})
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_11_college_a_cannot_access_college_b_document(self):
        """Test 11: Document isolation between College A and College B."""
        act_b = Activity.objects.create(
            college=self.college_b, department=self.dept_b, faculty=self.faculty_b,
            title='College B Activity', status=ActivityStatus.DRAFT
        )
        doc_b = Document.objects.create(
            activity=act_b, college=self.college_b, uploaded_by=self.faculty_b,
            file=SimpleUploadedFile("cert_b.pdf", b"pdf content", content_type="application/pdf"),
            file_name="cert_b.pdf", file_size=100, mime_type="application/pdf"
        )
        self.client.force_authenticate(user=self.faculty_1)
        res = self.client.get(f'/api/documents/{doc_b.id}/preview/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_12_client_cannot_arbitrarily_set_verified_status(self):
        """Test 12: Direct client attempt to patch status to VERIFIED_EVIDENCE is rejected."""
        activity = Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_1,
            academic_year=self.ay, category=self.cat_fdp, title='Draft Attempt',
            status=ActivityStatus.DRAFT
        )
        self.client.force_authenticate(user=self.faculty_1)
        self.client.patch(f'/api/activities/{activity.id}/', {'status': ActivityStatus.VERIFIED_EVIDENCE})
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.DRAFT)

    def test_13_duplicate_activity_detection(self):
        """Test 13: Duplicate activity checker flags existing title."""
        Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_1,
            academic_year=self.ay, category=self.cat_fdp, title='Unique Workshop on Docker',
            status=ActivityStatus.DRAFT
        )
        self.client.force_authenticate(user=self.faculty_1)
        res = self.client.post('/api/activities/check-duplicate/', {
            'title': 'Unique Workshop on Docker',
            'academic_year': str(self.ay.id)
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['is_duplicate'])
        self.assertEqual(res.data['count'], 1)

    def test_returned_incharge_recovery_and_duplicate(self):
        activity = Activity.objects.create(college=self.college_a, department=self.dept_cse,
            faculty=self.faculty_1, academic_year=self.ay, category=self.cat_fdp,
            title='Returned review', status=ActivityStatus.RETURNED_TO_INCHARGE)
        rec = VerificationRecord.objects.create(activity=activity, college=self.college_a,
            current_status=activity.status)
        self.client.force_authenticate(user=self.incharge_cse)
        url = f'/api/v1/verifications/{rec.id}/incharge-verify/'
        first = self.client.post(url, {'decision': 'APPROVE'})
        self.assertEqual(first.status_code, 200)
        count = rec.logs.count()
        self.assertEqual(self.client.post(url, {'decision': 'APPROVE'}).status_code, 400)
        self.assertEqual(rec.logs.count(), count)
        activity.refresh_from_db()
        self.assertEqual(activity.status, ActivityStatus.PENDING_HOD)
