"""
Automated tests for Phase 4: Digital Evidence Repository, Document Management & Smart Search
"""
import io
import zipfile
import hashlib
from datetime import date, timedelta
from django.test import TestCase
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
import openpyxl

from apps.colleges.models import College
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.accounts.models import User, UserRole
from apps.activities.models import Activity, ActivityType, ActivityStatus, Document, DocumentCategory
from apps.evidence.models import Evidence


class Phase4EvidenceRepositoryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # 1. College A & College B (Multi-tenant test)
        self.college_a = College.objects.create(name="Apex Institute", code="APEX")
        self.college_b = College.objects.create(name="Zenith University", code="ZENITH")

        # 2. Departments
        self.dept_cse = Department.objects.create(college=self.college_a, name="Computer Science", code="CSE")
        self.dept_it = Department.objects.create(college=self.college_a, name="Information Tech", code="IT")
        self.dept_b_cse = Department.objects.create(college=self.college_b, name="Zenith CSE", code="ZCSE")

        # 3. Academic Years
        self.ay_2025 = AcademicYear.objects.create(
            college=self.college_a, name="2025-26", start_date=date(2025, 7, 1), end_date=date(2026, 6, 30), is_current=True
        )
        self.ay_2024 = AcademicYear.objects.create(
            college=self.college_a, name="2024-25", start_date=date(2024, 7, 1), end_date=date(2025, 6, 30), is_current=False
        )

        # 4. Users
        self.iqac_user = User.objects.create_user(
            email="iqac@apex.edu", password="password123", college=self.college_a, role=UserRole.IQAC
        )
        self.hod_cse = User.objects.create_user(
            email="hod.cse@apex.edu", password="password123", college=self.college_a, department=self.dept_cse, role=UserRole.HOD
        )
        self.incharge_cse = User.objects.create_user(
            email="incharge.cse@apex.edu", password="password123", college=self.college_a, department=self.dept_cse, role=UserRole.DEPARTMENT_INCHARGE
        )
        self.faculty_cse = User.objects.create_user(
            email="faculty.cse@apex.edu", password="password123", college=self.college_a, department=self.dept_cse, role=UserRole.FACULTY, employee_id="EMP-CSE-101"
        )
        self.faculty_it = User.objects.create_user(
            email="faculty.it@apex.edu", password="password123", college=self.college_a, department=self.dept_it, role=UserRole.FACULTY, employee_id="EMP-IT-201"
        )
        self.faculty_b = User.objects.create_user(
            email="faculty@zenith.edu", password="password123", college=self.college_b, department=self.dept_b_cse, role=UserRole.FACULTY
        )

        # 5. Document categories
        self.cat_cert = DocumentCategory.objects.create(name="Certificate", code="CERTIFICATE", is_active=True)
        self.cat_att = DocumentCategory.objects.create(name="Attendance Sheet", code="ATTENDANCE", is_active=True)

        # 6. Sample Verified Activities & Evidence
        # Evidence 1: CSE Faculty FDP
        self.sample_pdf = b"%PDF-1.4 Fake PDF Content for Unit Testing"
        self.pdf_hash = hashlib.sha256(self.sample_pdf).hexdigest()

        self.act_1 = Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_cse,
            academic_year=self.ay_2025, title="Artificial Intelligence & Neural Networks FDP",
            activity_type=ActivityType.FDP, organizer="AICTE ATAL", location="Chennai",
            start_date=date(2025, 8, 1), end_date=date(2025, 8, 5), duration="5 Days",
            certificate_number="ATAL-AI-2025-01", status=ActivityStatus.VERIFIED_EVIDENCE
        )
        self.doc_1 = Document.objects.create(
            activity=self.act_1, college=self.college_a, department=self.dept_cse, uploaded_by=self.faculty_cse,
            file_name="AI_FDP_Certificate.pdf", original_filename="AI_FDP_Certificate.pdf", file_size=len(self.sample_pdf),
            mime_type="application/pdf", file_hash=self.pdf_hash, is_primary=True, category=self.cat_cert
        )
        self.doc_1.file.save("AI_FDP_Certificate.pdf", SimpleUploadedFile("AI_FDP_Certificate.pdf", self.sample_pdf))

        self.ev_1 = Evidence.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_cse,
            activity=self.act_1, academic_year=self.ay_2025, document=self.doc_1,
            title=self.act_1.title, description="Deep learning training", category="Faculty Development Program",
            is_verified=True, verified_at=timezone.now(), status="ACTIVE"
        )

        # Evidence 2: IT Faculty Workshop
        self.act_2 = Activity.objects.create(
            college=self.college_a, department=self.dept_it, faculty=self.faculty_it,
            academic_year=self.ay_2024, title="Microservices & Docker Workshop 2024",
            activity_type=ActivityType.WORKSHOP, organizer="Red Hat Academy", location="Bengaluru",
            start_date=date(2024, 9, 10), end_date=date(2024, 9, 12), duration="3 Days",
            certificate_number="RH-2024-991", status=ActivityStatus.VERIFIED_EVIDENCE
        )
        self.ev_2 = Evidence.objects.create(
            college=self.college_a, department=self.dept_it, faculty=self.faculty_it,
            activity=self.act_2, academic_year=self.ay_2024, document=None,
            title=self.act_2.title, description="Docker containers", category="Workshop",
            is_verified=True, verified_at=timezone.now(), status="ACTIVE"
        )

        # Evidence 3: College B Evidence (Tenant Isolation)
        self.act_b = Activity.objects.create(
            college=self.college_b, department=self.dept_b_cse, faculty=self.faculty_b,
            title="Zenith Quantum Computing Seminar", activity_type=ActivityType.SEMINAR,
            status=ActivityStatus.VERIFIED_EVIDENCE
        )
        self.ev_b = Evidence.objects.create(
            college=self.college_b, department=self.dept_b_cse, faculty=self.faculty_b,
            activity=self.act_b, title=self.act_b.title, is_verified=True, status="ACTIVE"
        )

    def test_iqac_can_view_all_college_evidence(self):
        """IQAC sees active verified evidence for College A, not College B."""
        self.client.force_authenticate(user=self.iqac_user)
        res = self.client.get("/api/evidence/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        ids = [item['id'] for item in results]
        self.assertIn(str(self.ev_1.id), ids)
        self.assertIn(str(self.ev_2.id), ids)
        self.assertNotIn(str(self.ev_b.id), ids)

    def test_faculty_isolation(self):
        """Faculty sees ONLY their own evidence; cannot access other faculty evidence."""
        self.client.force_authenticate(user=self.faculty_cse)
        res = self.client.get("/api/evidence/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        ids = [item['id'] for item in results]
        self.assertIn(str(self.ev_1.id), ids)
        self.assertNotIn(str(self.ev_2.id), ids) # IT faculty evidence excluded

        # Direct access to IT faculty evidence forbidden/not found
        res_detail = self.client.get(f"/api/evidence/{self.ev_2.id}/")
        self.assertEqual(res_detail.status_code, status.HTTP_404_NOT_FOUND)

    def test_department_isolation(self):
        """HOD CSE sees only CSE evidence; cannot see IT evidence."""
        self.client.force_authenticate(user=self.hod_cse)
        res = self.client.get("/api/evidence/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        ids = [item['id'] for item in results]
        self.assertIn(str(self.ev_1.id), ids)
        self.assertNotIn(str(self.ev_2.id), ids)

    def test_search_partial_matching(self):
        """Search matches title, organizer, faculty name, or employee ID."""
        self.client.force_authenticate(user=self.iqac_user)
        
        # Search by keyword
        res = self.client.get("/api/evidence/?search=Neural")
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], str(self.ev_1.id))

        # Search by organizer
        res2 = self.client.get("/api/evidence/?search=Red+Hat")
        results2 = res2.data.get('results', res2.data)
        self.assertEqual(len(results2), 1)
        self.assertEqual(results2[0]['id'], str(self.ev_2.id))

        # Search by employee ID
        res3 = self.client.get("/api/evidence/?search=EMP-CSE-101")
        results3 = res3.data.get('results', res3.data)
        self.assertEqual(len(results3), 1)
        self.assertEqual(results3[0]['id'], str(self.ev_1.id))

    def test_combined_filters(self):
        """Combined filters: academic_year + department."""
        self.client.force_authenticate(user=self.iqac_user)
        res = self.client.get(f"/api/evidence/?academic_year={self.ay_2025.id}&department={self.dept_cse.id}")
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], str(self.ev_1.id))

        # Non-matching filter returns empty
        res_empty = self.client.get(f"/api/evidence/?academic_year={self.ay_2024.id}&department={self.dept_cse.id}")
        results_empty = res_empty.data.get('results', res_empty.data)
        self.assertEqual(len(results_empty), 0)

    def test_repository_stats_endpoint(self):
        """Stats endpoint returns real counts and breakdowns."""
        self.client.force_authenticate(user=self.iqac_user)
        res = self.client.get("/api/evidence/stats/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data
        self.assertEqual(data['total_verified'], 2)
        self.assertEqual(data['current_year_verified'], 1)
        self.assertTrue(len(data['department_breakdown']) >= 2)

    def test_csv_export(self):
        """Export as CSV returns attachment with headers."""
        self.client.force_authenticate(user=self.iqac_user)
        res = self.client.get("/api/evidence/export/?format=csv")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", res.headers['Content-Type'])
        content = res.content.decode('utf-8')
        self.assertIn("Activity Title", content)
        self.assertIn("Artificial Intelligence & Neural Networks FDP", content)

    def test_excel_export(self):
        """Export as Excel (.xlsx) returns valid openpyxl workbook."""
        self.client.force_authenticate(user=self.iqac_user)
        res = self.client.get("/api/evidence/export/?format=excel")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("openxmlformats", res.headers['Content-Type'])
        
        # Verify valid Excel workbook
        wb = openpyxl.load_workbook(io.BytesIO(res.content))
        ws = wb.active
        self.assertIn("CENTRAL QUALITY ASSURANCE CELL", ws['A1'].value)

    def test_bulk_zip_download(self):
        """Bulk ZIP endpoint packages certificate files into a valid ZIP."""
        self.client.force_authenticate(user=self.iqac_user)
        res = self.client.post("/api/evidence/bulk-zip/", {"ids": [str(self.ev_1.id)]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("application/zip", res.headers['Content-Type'])
        
        # Verify valid zip
        zf = zipfile.ZipFile(io.BytesIO(res.content))
        file_list = zf.namelist()
        self.assertTrue(any("AI_FDP_Certificate.pdf" in name for name in file_list))

    def test_multi_document_attachment(self):
        """Attaching supplementary document (attendance sheet) to evidence activity."""
        self.client.force_authenticate(user=self.iqac_user)
        attendance_file = SimpleUploadedFile("Session_Attendance.pdf", b"%PDF-1.4 Attendance Register", content_type="application/pdf")
        
        res = self.client.post(
            f"/api/evidence/{self.ev_1.id}/add-document/",
            {
                "file": attendance_file,
                "document_type": "SUPPORTING",
                "category": str(self.cat_att.id),
                "description": "Final day signed attendance log"
            },
            format='multipart'
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.act_1.documents.count(), 2)
        
        # Detail view includes both documents
        detail_res = self.client.get(f"/api/evidence/{self.ev_1.id}/")
        docs = detail_res.data['supporting_documents']
        self.assertEqual(len(docs), 2)

    def test_duplicate_document_detection(self):
        """Duplicate file upload returns duplicate warning message with existing file reference."""
        self.client.force_authenticate(user=self.iqac_user)
        # Upload identical file as doc_1
        dup_file = SimpleUploadedFile("Duplicate_Cert.pdf", self.sample_pdf, content_type="application/pdf")
        res = self.client.post(
            f"/api/evidence/{self.ev_1.id}/add-document/",
            {"file": dup_file, "document_type": "SUPPORTING"},
            format='multipart'
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data['is_duplicate'])
        self.assertIn("Possible duplicate file detected", res.data['duplicate_warning'])

    def test_archive_and_restore(self):
        """IQAC can archive evidence; archived items disappear from default list; can be restored."""
        self.client.force_authenticate(user=self.iqac_user)
        
        # Archive
        res_arch = self.client.post(f"/api/evidence/{self.ev_1.id}/archive/", {"reason": "Superseded by 2026 FDP"}, format='json')
        self.assertEqual(res_arch.status_code, status.HTTP_200_OK)
        self.ev_1.refresh_from_db()
        self.assertEqual(self.ev_1.status, "ARCHIVED")

        # Default query excludes archived
        res_list = self.client.get("/api/evidence/")
        ids = [item['id'] for item in res_list.data.get('results', res_list.data)]
        self.assertNotIn(str(self.ev_1.id), ids)

        # Restore
        res_restore = self.client.post(f"/api/evidence/{self.ev_1.id}/restore/", format='json')
        self.assertEqual(res_restore.status_code, status.HTTP_200_OK)
        self.ev_1.refresh_from_db()
        self.assertEqual(self.ev_1.status, "ACTIVE")

    def test_faculty_cannot_archive_evidence(self):
        """Faculty cannot archive verified institutional evidence (Section 34)."""
        self.client.force_authenticate(user=self.faculty_cse)
        res = self.client.post(f"/api/evidence/{self.ev_1.id}/archive/", {"reason": "Attempting archive"}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
