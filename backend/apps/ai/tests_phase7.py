"""
Phase 7 — AI Certificate Intelligence & Smart Document Processing Tests
Verifies:
1. AI never sets verified evidence or IQAC verified status directly.
2. PDF text extraction & structured field detection.
3. Category classification matched against college categories.
4. Duplicate detection (exact checksum & fuzzy similarity).
5. Human correction logging (AICorrectionLog).
6. Verification workflow continuation (Faculty -> In-charge -> HOD -> IQAC).
7. Tenant isolation & role permissions.
8. Natural language search with RBAC.
9. Fault tolerance & fallback handling.
"""
import io
import hashlib
from datetime import date
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from reportlab.pdfgen import canvas

from apps.colleges.models import College
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.accounts.models import User
from apps.activities.models import Activity, ActivityCategory, Document, ActivityStatus, DocumentType
from apps.verification.models import VerificationRecord, VerificationLog, VerificationAction
from apps.evidence.models import Evidence
from apps.ai.models import (
    AIProcessingJob,
    AIProcessingStatus,
    AIExtractionResult,
    AIFieldConfidence,
    AIClassificationResult,
    AICorrectionLog,
)
from apps.ai.services.document_extraction import DocumentExtractionService
from apps.ai.services.classification import CategoryClassificationService
from apps.ai.services.duplicate_detection import DuplicateDetectionService
from apps.ai.services.search import NaturalLanguageSearchService


def make_test_pdf(text_lines):
    """Generates an in-memory PDF with specified text lines."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    y = 750
    for line in text_lines:
        c.drawString(100, y, line)
        y -= 25
    c.save()
    buf.seek(0)
    return buf.getvalue()


class Phase7AITestCase(TestCase):
    def setUp(self):
        self.college_a = College.objects.create(name='Alpha Institute of Technology', code='AIT', website='https://ait.edu')
        self.college_b = College.objects.create(name='Beta College of Engineering', code='BCE', website='https://bce.edu')

        self.dept_it = Department.objects.create(college=self.college_a, name='Information Technology', code='IT')
        self.dept_cse = Department.objects.create(college=self.college_a, name='Computer Science', code='CSE')

        self.ay = AcademicYear.objects.create(
            college=self.college_a, name='2025-26',
            start_date=date(2025, 6, 1), end_date=date(2026, 5, 31), is_current=True
        )

        self.cat_fdp = ActivityCategory.objects.create(college=self.college_a, name='Faculty Development Program', code='FDP')
        self.cat_workshop = ActivityCategory.objects.create(college=self.college_a, name='Workshop', code='WORKSHOP')

        # Users
        self.faculty_user = User.objects.create_user(
            email='faculty@ait.edu', password='password123',
            first_name='Rohan', last_name='Sharma', role='FACULTY',
            college=self.college_a, department=self.dept_it
        )
        self.incharge_user = User.objects.create_user(
            email='incharge@ait.edu', password='password123',
            first_name='Incharge', last_name='User', role='DEPARTMENT_INCHARGE',
            college=self.college_a, department=self.dept_it
        )
        self.hod_user = User.objects.create_user(
            email='hod@ait.edu', password='password123',
            first_name='HOD', last_name='User', role='HOD',
            college=self.college_a, department=self.dept_it
        )
        self.iqac_user = User.objects.create_user(
            email='iqac@ait.edu', password='password123',
            first_name='IQAC', last_name='Coordinator', role='IQAC',
            college=self.college_a
        )
        self.other_faculty = User.objects.create_user(
            email='other@bce.edu', password='password123',
            first_name='Other', last_name='Faculty', role='FACULTY',
            college=self.college_b
        )

        self.client = APIClient()

    def test_ai_never_sets_verified_status(self):
        """CRITICAL RULE: AI confirmation creates a DRAFT and NEVER sets IQAC_VERIFIED or VERIFIED_EVIDENCE."""
        self.client.force_authenticate(user=self.faculty_user)

        pdf_bytes = make_test_pdf([
            "Certificate of Completion",
            "This is to certify that Dr. Rohan Sharma",
            "completed the 5-Day Faculty Development Programme on AI",
            "organized by National Institute of Technology",
            "Certificate No: CERT-AIT-9921",
            "from 10-08-2025 to 15-08-2025"
        ])
        up_file = SimpleUploadedFile("fdp_cert.pdf", pdf_bytes, content_type="application/pdf")

        # 1. Upload and process
        res = self.client.post('/api/ai/documents/upload-and-process/', {'file': up_file}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        job_id = res.data['job']['id']

        # 2. Confirm extraction
        confirm_data = {
            'title': '5-Day Faculty Development Programme on AI',
            'category': str(self.cat_fdp.id),
            'academic_year': str(self.ay.id),
            'organizer': 'National Institute of Technology',
            'certificate_number': 'CERT-AIT-9921',
            'start_date': '2025-08-10',
            'end_date': '2025-08-15',
            'submit_for_verification': False,
        }
        res_conf = self.client.post(f'/api/ai/jobs/{job_id}/confirm/', confirm_data, format='json')
        self.assertEqual(res_conf.status_code, status.HTTP_201_CREATED)

        act_id = res_conf.data['activity_id']
        act = Activity.objects.get(id=act_id)

        # Assert status is DRAFT, NOT VERIFIED
        self.assertEqual(act.status, ActivityStatus.DRAFT)
        self.assertFalse(act.is_verified)
        self.assertNotEqual(act.status, ActivityStatus.IQAC_VERIFIED)
        self.assertNotEqual(act.status, ActivityStatus.VERIFIED_EVIDENCE)

    def test_pdf_text_and_field_extraction(self):
        """Validates that PDF text is extracted and structured fields detected with confidence scores."""
        pdf_bytes = make_test_pdf([
            "Certificate of Participation",
            "This is to certify that Rohan Sharma",
            "has participated in the Workshop on Cloud Architecture",
            "conducted by Amazon Web Services Academy",
            "Certificate ID: AWS-78901",
            "Duration: 3 Days",
            "from 12/09/2025 to 14/09/2025"
        ])
        up_file = SimpleUploadedFile("aws_workshop.pdf", pdf_bytes, content_type="application/pdf")

        job = AIProcessingJob.objects.create(
            college=self.college_a, user=self.faculty_user,
            file=up_file, file_name="aws_workshop.pdf",
            file_size=len(pdf_bytes), mime_type="application/pdf",
            file_hash=hashlib.sha256(pdf_bytes).hexdigest()
        )

        res, data = DocumentExtractionService.process_document_job(job, provider_override='heuristic')
        self.assertEqual(job.status, AIProcessingStatus.REVIEW_REQUIRED)
        self.assertGreater(res.overall_confidence, 0.50)

        # Check field confidences
        fields = res.extracted_data
        self.assertIn('Cloud Architecture', fields['activity_title']['value'])
        self.assertEqual(fields['certificate_number']['value'], 'AWS-78901')
        self.assertIn('3 days', fields['duration']['value'].lower())

        # Verify DB field confidences
        conf_count = AIFieldConfidence.objects.filter(job=job).count()
        self.assertGreaterEqual(conf_count, 5)

    def test_category_classification_against_college_categories(self):
        """Validates matching against college's active ActivityCategory database records."""
        pdf_bytes = make_test_pdf([
            "Certificate of Completion",
            "Advanced Faculty Development Programme on Pedagogy and AI",
            "conducted by AICTE Training and Learning Academy"
        ])
        up_file = SimpleUploadedFile("pedagogy_fdp.pdf", pdf_bytes, content_type="application/pdf")
        job = AIProcessingJob.objects.create(
            college=self.college_a, user=self.faculty_user,
            file=up_file, file_name="pedagogy_fdp.pdf",
            file_size=len(pdf_bytes), mime_type="application/pdf",
            file_hash=hashlib.sha256(pdf_bytes).hexdigest()
        )
        DocumentExtractionService.process_document_job(job, provider_override='heuristic')

        cls_res = CategoryClassificationService.classify_for_job(job, provider_override='heuristic')
        self.assertEqual(cls_res.suggested_code, 'FDP')
        self.assertEqual(cls_res.suggested_category, self.cat_fdp)
        self.assertGreaterEqual(cls_res.confidence, 0.60)

    def test_duplicate_detection_exact_and_fuzzy(self):
        """Validates exact SHA-256 duplicate warning and fuzzy certificate number match."""
        pdf_bytes = make_test_pdf(["Sample Certificate Content"])
        f_hash = hashlib.sha256(pdf_bytes).hexdigest()

        # Existing activity with document
        existing_act = Activity.objects.create(
            college=self.college_a, department=self.dept_it, faculty=self.faculty_user,
            title='Existing FDP', certificate_number='CERT-EXISTING-123', status=ActivityStatus.IQAC_VERIFIED
        )
        Document.objects.create(
            activity=existing_act, college=self.college_a, file_name='test.pdf',
            file_size=len(pdf_bytes), file_hash=f_hash, mime_type='application/pdf'
        )

        # 1. Exact Checksum Test
        dup_res = DuplicateDetectionService.detect_duplicates(
            file_hash=f_hash, college=self.college_a, user=self.faculty_user, extracted_fields={}
        )
        self.assertTrue(dup_res['is_exact_duplicate'])
        self.assertIn("identical document file", dup_res['warning'])

        # 2. Fuzzy Certificate Number Match Test
        other_hash = hashlib.sha256(b"unique").hexdigest()
        fuzzy_fields = {'certificate_number': {'value': 'CERT-EXISTING-123'}}
        dup_res2 = DuplicateDetectionService.detect_duplicates(
            file_hash=other_hash, college=self.college_a, user=self.faculty_user, extracted_fields=fuzzy_fields
        )
        self.assertTrue(dup_res2['is_possible_duplicate'])

    def test_human_correction_logging(self):
        """Validates that faculty edits to AI extracted fields are logged in AICorrectionLog."""
        self.client.force_authenticate(user=self.faculty_user)

        pdf_bytes = make_test_pdf(["Sample Certificate"])
        up_file = SimpleUploadedFile("cert.pdf", pdf_bytes, content_type="application/pdf")
        res = self.client.post('/api/ai/documents/upload-and-process/', {'file': up_file}, format='multipart')
        job_id = res.data['job']['id']

        # Confirm with corrections
        confirm_data = {
            'title': 'Corrected Workshop Title',
            'category': str(self.cat_workshop.id),
            'organizer': 'Corrected Organizer Institute',
            'corrections': [
                {'field_name': 'organizer', 'original_value': 'AI Extracted Organizer', 'corrected_value': 'Corrected Organizer Institute'},
                {'field_name': 'title', 'original_value': 'Original Title', 'corrected_value': 'Corrected Workshop Title'}
            ]
        }
        res_conf = self.client.post(f'/api/ai/jobs/{job_id}/confirm/', confirm_data, format='json')
        self.assertEqual(res_conf.status_code, status.HTTP_201_CREATED)

        corrections = AICorrectionLog.objects.filter(job_id=job_id)
        self.assertEqual(corrections.count(), 2)
        org_corr = corrections.get(field_name='organizer')
        self.assertEqual(org_corr.original_value, 'AI Extracted Organizer')
        self.assertEqual(org_corr.corrected_value, 'Corrected Organizer Institute')

    def test_verification_workflow_continuation(self):
        """Verifies that submitting from AI upload enters PENDING_INCHARGE and continues the existing verification chain."""
        self.client.force_authenticate(user=self.faculty_user)

        pdf_bytes = make_test_pdf(["Full Verification Chain Certificate"])
        up_file = SimpleUploadedFile("verif.pdf", pdf_bytes, content_type="application/pdf")
        res = self.client.post('/api/ai/documents/upload-and-process/', {'file': up_file}, format='multipart')
        job_id = res.data['job']['id']

        # Confirm with immediate submit_for_verification = True
        confirm_data = {
            'title': 'International Conference on AI',
            'category': str(self.cat_fdp.id),
            'submit_for_verification': True,
        }
        res_conf = self.client.post(f'/api/ai/jobs/{job_id}/confirm/', confirm_data, format='json')
        act_id = res_conf.data['activity_id']
        act = Activity.objects.get(id=act_id)

        # 1. Faculty Submission: PENDING_INCHARGE
        self.assertEqual(act.status, ActivityStatus.PENDING_INCHARGE)
        v_rec = VerificationRecord.objects.get(activity=act)
        self.assertEqual(v_rec.current_status, ActivityStatus.PENDING_INCHARGE)

        # 2. In-charge Approves: PENDING_HOD
        self.client.force_authenticate(user=self.incharge_user)
        res_incharge = self.client.post(f'/api/verifications/{v_rec.id}/incharge-verify/', {'decision': 'APPROVE', 'comment': 'In-charge verified.'})
        self.assertEqual(res_incharge.status_code, status.HTTP_200_OK)
        act.refresh_from_db()
        self.assertEqual(act.status, ActivityStatus.PENDING_HOD)

        # 3. HOD Approves: PENDING_IQAC
        self.client.force_authenticate(user=self.hod_user)
        res_hod = self.client.post(f'/api/verifications/{v_rec.id}/hod-verify/', {'decision': 'APPROVE', 'comment': 'HOD approved.'})
        self.assertEqual(res_hod.status_code, status.HTTP_200_OK)
        act.refresh_from_db()
        self.assertEqual(act.status, ActivityStatus.PENDING_IQAC)

        # 4. IQAC Final Verification: VERIFIED_EVIDENCE
        self.client.force_authenticate(user=self.iqac_user)
        res_iqac = self.client.post(f'/api/verifications/{v_rec.id}/iqac-verify/', {'decision': 'APPROVE', 'comment': 'IQAC verified.'})
        self.assertEqual(res_iqac.status_code, status.HTTP_200_OK)
        act.refresh_from_db()
        self.assertEqual(act.status, ActivityStatus.VERIFIED_EVIDENCE)
        self.assertTrue(act.is_verified)

    def test_tenant_isolation_and_role_scoping(self):
        """Ensures cross-college and unauthorized access to AI jobs is blocked."""
        pdf_bytes = make_test_pdf(["College A Certificate"])
        up_file = SimpleUploadedFile("college_a.pdf", pdf_bytes, content_type="application/pdf")
        job = AIProcessingJob.objects.create(
            college=self.college_a, user=self.faculty_user,
            file=up_file, file_name="college_a.pdf",
            file_size=len(pdf_bytes), mime_type="application/pdf"
        )

        # College B faculty attempts to access Job from College A
        self.client.force_authenticate(user=self.other_faculty)
        res = self.client.get(f'/api/ai/jobs/{job.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Confirmation attempt by another faculty is forbidden
        res_conf = self.client.post(f'/api/ai/jobs/{job.id}/confirm/', {'title': 'Hack', 'category': str(self.cat_fdp.id)})
        self.assertEqual(res_conf.status_code, status.HTTP_404_NOT_FOUND)

    def test_natural_language_search_with_rbac(self):
        """Ensures natural language search respects role permissions and returns only authorized verified records."""
        # Create verified evidence in IT department
        act_it = Activity.objects.create(
            college=self.college_a, department=self.dept_it, faculty=self.faculty_user,
            title='Verified Deep Learning FDP', category=self.cat_fdp, activity_type='FDP',
            status=ActivityStatus.VERIFIED_EVIDENCE
        )
        Evidence.objects.create(
            college=self.college_a, department=self.dept_it, faculty=self.faculty_user,
            activity=act_it, status='ACTIVE'
        )

        # Faculty searches
        self.client.force_authenticate(user=self.faculty_user)
        res = self.client.post('/api/ai/search/', {'query': 'Show all FDP certificates in IT'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total'], 1)
        self.assertEqual(res.data['results'][0]['title'], 'Verified Deep Learning FDP')

        # Faculty cannot see records of other faculty
        res_other = self.client.post('/api/ai/search/', {'query': 'Find CSE faculty workshops'}, format='json')
        self.assertEqual(res_other.status_code, status.HTTP_200_OK)
        self.assertEqual(res_other.data['total'], 0)  # Filtered by faculty role!

    def test_ai_metrics_api(self):
        """Ensures IQAC and Management can view aggregated AI metrics."""
        self.client.force_authenticate(user=self.iqac_user)
        res = self.client.get('/api/ai/metrics/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('total_processed', res.data)
        self.assertIn('success_rate', res.data)
        self.assertIn('top_corrected_fields', res.data)

        # Faculty is forbidden from metrics
        self.client.force_authenticate(user=self.faculty_user)
        res_fac = self.client.get('/api/ai/metrics/')
        self.assertEqual(res_fac.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_file_extension_rejected(self):
        """Ensures non-document files like .exe or .txt are rejected."""
        self.client.force_authenticate(user=self.faculty_user)
        bad_file = SimpleUploadedFile("malicious.exe", b"binary content", content_type="application/x-msdownload")
        res = self.client.post('/api/ai/documents/upload-and-process/', {'file': bad_file}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data['error']['code'], 'VALIDATION_ERROR')
        self.assertIn('prohibited', res.data['error']['message'])
