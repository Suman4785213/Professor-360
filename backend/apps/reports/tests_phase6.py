"""
Phase 6 Automated Report Generation Engine - Comprehensive Test Suite
Validates:
- Report types listing and access
- Report Data Service: filtering, verified data rule (Rule 1)
- Multi-format generation: PDF, Excel, Word (.docx)
- Template versioning and placeholder resolution
- Role-based permissions and tenant isolation
- Empty data handling
- Audit logging
"""
import io
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.colleges.models import College
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityCategory, ActivityStatus
from apps.reports.models import (
    ReportType, ReportTemplate, ReportTemplateVersion, GeneratedReport,
    ReportFormat, ReportStatus
)
from apps.reports.services import (
    ReportDataService, PDFReportGenerator, ExcelReportGenerator,
    WordReportGenerator, ReportGenerationCoordinator
)
from apps.audit.models import AuditLog

User = get_user_model()


class Phase6ReportEngineTestCase(TestCase):
    def setUp(self):
        # 1. Colleges
        self.college_a = College.objects.create(name="Alpha Institute", code="ALPHA", is_active=True)
        self.college_b = College.objects.create(name="Beta University", code="BETA", is_active=True)

        # 2. Departments
        self.dept_it = Department.objects.create(college=self.college_a, name="Information Technology", code="IT")
        self.dept_cse = Department.objects.create(college=self.college_a, name="Computer Science", code="CSE")
        self.dept_b = Department.objects.create(college=self.college_b, name="Mechanical", code="MECH")

        # 3. Academic Years
        self.ay_2025 = AcademicYear.objects.create(
            college=self.college_a, name="2025-26", is_current=True,
            start_date="2025-06-01", end_date="2026-05-31"
        )
        self.ay_2024 = AcademicYear.objects.create(
            college=self.college_a, name="2024-25", is_current=False,
            start_date="2024-06-01", end_date="2025-05-31"
        )

        # 4. Users
        self.iqac_user = User.objects.create_user(
            email="iqac@alpha.edu", password="password123",
            role="IQAC", college=self.college_a, first_name="IQAC", last_name="Officer"
        )
        self.hod_it_user = User.objects.create_user(
            email="hod.it@alpha.edu", password="password123",
            role="HOD", college=self.college_a, department=self.dept_it, first_name="HOD", last_name="IT"
        )
        self.faculty_it = User.objects.create_user(
            email="faculty.it@alpha.edu", password="password123",
            role="FACULTY", college=self.college_a, department=self.dept_it, first_name="Alice", last_name="Smith"
        )
        self.faculty_cse = User.objects.create_user(
            email="faculty.cse@alpha.edu", password="password123",
            role="FACULTY", college=self.college_a, department=self.dept_cse, first_name="Bob", last_name="Jones"
        )
        self.mgmt_user = User.objects.create_user(
            email="mgmt@alpha.edu", password="password123",
            role="MANAGEMENT", college=self.college_a, first_name="Trustee", last_name="Officer"
        )
        self.college_b_user = User.objects.create_user(
            email="iqac@beta.edu", password="password123",
            role="IQAC", college=self.college_b, first_name="Beta", last_name="Officer"
        )

        # 5. Activity Categories
        self.cat_fdp = ActivityCategory.objects.create(name="Faculty Development Program", code="FDP", is_active=True)
        self.cat_conf = ActivityCategory.objects.create(name="Conference", code="CONF", is_active=True)

        # 6. Activities with distinct verification statuses
        # Verified record (Should be included)
        self.act_verified = Activity.objects.create(
            college=self.college_a, faculty=self.faculty_it, department=self.dept_it,
            academic_year=self.ay_2025, category=self.cat_fdp,
            title="Advanced Machine Learning FDP", status=ActivityStatus.IQAC_VERIFIED,
            start_date="2025-08-01", end_date="2025-08-05", organizer="IIT Madras"
        )
        # Unverified Draft (Must be excluded)
        self.act_draft = Activity.objects.create(
            college=self.college_a, faculty=self.faculty_it, department=self.dept_it,
            academic_year=self.ay_2025, category=self.cat_fdp,
            title="Draft FDP Workshop", status=ActivityStatus.DRAFT,
            start_date="2025-08-10", organizer="Local Cell"
        )
        # Pending Verification (Must be excluded)
        self.act_pending = Activity.objects.create(
            college=self.college_a, faculty=self.faculty_it, department=self.dept_it,
            academic_year=self.ay_2025, category=self.cat_fdp,
            title="Pending Approval FDP", status=ActivityStatus.PENDING_IQAC,
            start_date="2025-08-12", organizer="Anna Univ"
        )
        # Rejected Activity (Must be excluded)
        self.act_rejected = Activity.objects.create(
            college=self.college_a, faculty=self.faculty_it, department=self.dept_it,
            academic_year=self.ay_2025, category=self.cat_fdp,
            title="Rejected Seminar", status=ActivityStatus.REJECTED_IQAC,
            start_date="2025-08-15", organizer="External"
        )

        # 7. Report Type
        self.rep_type_fdp = ReportType.objects.create(
            college=self.college_a, name="FDP Report", code="FDP_REPORT",
            category_code="FDP", default_format=ReportFormat.PDF, is_active=True
        )

        self.client = APIClient()

    # --- Test 1: Verified Data Rule (Section 16, Rule 1) ---
    def test_verified_data_rule_enforcement(self):
        """Only IQAC_VERIFIED and VERIFIED_EVIDENCE data must be included in reports."""
        filters = {
            'academic_year': str(self.ay_2025.id),
            'department': str(self.dept_it.id),
            'category': str(self.cat_fdp.id)
        }
        report_data = ReportDataService.get_scoped_data(
            user=self.iqac_user,
            filters=filters,
            report_type=self.rep_type_fdp
        )

        records = report_data['records']
        # Only self.act_verified should be returned, draft, pending, rejected must be excluded
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['activity_title'], "Advanced Machine Learning FDP")
        self.assertEqual(records[0]['status'], ActivityStatus.IQAC_VERIFIED)

    # --- Test 2: PDF Generation (Section 12) ---
    def test_pdf_generation(self):
        """PDF generator should produce valid non-empty PDF bytes starting with %PDF-."""
        filters = {'academic_year': str(self.ay_2025.id)}
        report_data = ReportDataService.get_scoped_data(
            user=self.iqac_user,
            filters=filters,
            report_type=self.rep_type_fdp
        )
        pdf_bytes = PDFReportGenerator.generate(report_data)
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(pdf_bytes.startswith(b'%PDF-'))
        self.assertGreater(len(pdf_bytes), 1000)

    # --- Test 3: Excel Generation (Section 13) ---
    def test_excel_generation(self):
        """Excel generator should produce valid non-empty .xlsx bytes with PK zip signature."""
        filters = {'academic_year': str(self.ay_2025.id)}
        report_data = ReportDataService.get_scoped_data(
            user=self.iqac_user,
            filters=filters,
            report_type=self.rep_type_fdp
        )
        xlsx_bytes = ExcelReportGenerator.generate(report_data)
        self.assertIsInstance(xlsx_bytes, bytes)
        # .xlsx is a zip archive starting with PK (0x50, 0x4B)
        self.assertTrue(xlsx_bytes.startswith(b'PK'))
        self.assertGreater(len(xlsx_bytes), 1000)

    # --- Test 4: Word Generation (Section 14) ---
    def test_word_generation(self):
        """Word generator should produce valid non-empty .docx bytes with PK zip signature."""
        filters = {'academic_year': str(self.ay_2025.id)}
        report_data = ReportDataService.get_scoped_data(
            user=self.iqac_user,
            filters=filters,
            report_type=self.rep_type_fdp
        )
        docx_bytes = WordReportGenerator.generate(report_data)
        self.assertIsInstance(docx_bytes, bytes)
        self.assertTrue(docx_bytes.startswith(b'PK'))
        self.assertGreater(len(docx_bytes), 1000)

    # --- Test 5: Template Upload and Versioning (Section 7, 10, 11) ---
    def test_template_upload_and_versioning(self):
        """Templates can be uploaded and versioned without mutating old historical reports."""
        self.client.force_authenticate(user=self.iqac_user)
        dummy_docx = io.BytesIO(b"PK\x03\x04DummyDocxTemplateContent")
        dummy_file = SimpleUploadedFile("fdp_template_v1.docx", dummy_docx.getvalue(), content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")

        # 1. Create Template
        response = self.client.post('/api/report-templates/', {
            'report_type': str(self.rep_type_fdp.id),
            'name': 'Official FDP Template',
            'file_format': 'WORD',
            'file': dummy_file
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        template_id = response.data['id']
        self.assertEqual(response.data['version'], 1)

        # 2. Upload Version 2
        dummy_docx_v2 = io.BytesIO(b"PK\x03\x04UpdatedDocxTemplateContent")
        dummy_file_v2 = SimpleUploadedFile("fdp_template_v2.docx", dummy_docx_v2.getvalue(), content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")

        resp_v2 = self.client.post(f'/api/report-templates/{template_id}/upload-version/', {
            'file': dummy_file_v2,
            'change_summary': 'Updated header layout'
        }, format='multipart')
        self.assertEqual(resp_v2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_v2.data['version'], 2)

        # Verify ReportTemplateVersion records
        versions = ReportTemplateVersion.objects.filter(template_id=template_id).order_by('version_number')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[0].version_number, 1)
        self.assertEqual(versions[1].version_number, 2)

    # --- Test 6: Report Generation Coordinator & Audit Trail (Section 15, 35) ---
    def test_report_generation_coordinator_and_audit(self):
        """Generating a report records GeneratedReport and fires an AuditLog entry."""
        rep = ReportGenerationCoordinator.generate_report(
            user=self.iqac_user,
            report_type=self.rep_type_fdp,
            filters={'department': str(self.dept_it.id)},
            output_format=ReportFormat.PDF
        )
        self.assertEqual(rep.status, ReportStatus.COMPLETED)
        self.assertEqual(rep.record_count, 1)
        self.assertTrue(rep.file.name.endswith('.pdf'))
        self.assertGreater(rep.file_size, 0)

        # Verify Audit Log
        audit_entry = AuditLog.objects.filter(
            action='REPORT_GENERATED',
            object_id=str(rep.id)
        ).first()
        self.assertIsNotNone(audit_entry)
        self.assertEqual(audit_entry.actor_email, self.iqac_user.email)

    # --- Test 7: Role Permissions (Section 21, 22, 23, 25) ---
    def test_role_scoped_report_generation_and_download(self):
        """
        Faculty cannot access other faculty/dept report;
        HOD cannot access other department report.
        """
        # Create a report belonging to CSE department
        rep_cse = GeneratedReport.objects.create(
            college=self.college_a,
            report_type=self.rep_type_fdp,
            title="CSE Department Report",
            department=self.dept_cse,
            faculty=self.faculty_cse,
            output_format=ReportFormat.PDF,
            status=ReportStatus.COMPLETED,
            generated_by=self.iqac_user,
            file=SimpleUploadedFile("cse_report.pdf", b"%PDF-dummy")
        )

        # HOD of IT tries to download CSE report -> 403 Forbidden
        self.client.force_authenticate(user=self.hod_it_user)
        res_hod = self.client.get(f'/api/reports/{rep_cse.id}/download/')
        self.assertEqual(res_hod.status_code, status.HTTP_403_FORBIDDEN)

        # Faculty of IT tries to download CSE report -> 403 Forbidden
        self.client.force_authenticate(user=self.faculty_it)
        res_fac = self.client.get(f'/api/reports/{rep_cse.id}/download/')
        self.assertEqual(res_fac.status_code, status.HTTP_403_FORBIDDEN)

        # IQAC Officer can download it
        self.client.force_authenticate(user=self.iqac_user)
        res_iqac = self.client.get(f'/api/reports/{rep_cse.id}/download/')
        self.assertEqual(res_iqac.status_code, status.HTTP_200_OK)

    # --- Test 8: Tenant Isolation (Section 38, Rule 6) ---
    def test_tenant_isolation(self):
        """Users from College B cannot see or generate College A reports."""
        self.client.force_authenticate(user=self.college_b_user)
        res = self.client.get('/api/reports/history/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should not see any College A reports
        for rep in res.data['results']:
            self.assertNotEqual(rep['college_name'], self.college_a.name)

    # --- Test 9: Empty Data Handling (Section 27) ---
    def test_empty_data_handling(self):
        """Filters matching 0 records return empty dataset safely without failure."""
        filters = {
            'academic_year': str(self.ay_2024.id),  # No activities in 2024
            'department': str(self.dept_cse.id)
        }
        report_data = ReportDataService.get_scoped_data(
            user=self.iqac_user,
            filters=filters,
            report_type=self.rep_type_fdp
        )
        self.assertEqual(report_data['meta']['total_records'], 0)
        self.assertEqual(len(report_data['records']), 0)

