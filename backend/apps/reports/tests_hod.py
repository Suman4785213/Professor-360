import io
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.colleges.models import College
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.reports.models import ReportType, GeneratedReport, ReportFormat, ReportStatus
from apps.notifications.models import Notification

User = get_user_model()


class HODWorkflowAndIsolationTestCase(TestCase):
    def setUp(self):
        # Colleges
        self.college = College.objects.create(name="Demo Engineering College", code="DEMO-ENG", is_active=True)
        self.other_college = College.objects.create(name="Other College", code="OTHER", is_active=True)

        # Departments
        self.dept_cse = Department.objects.create(college=self.college, name="Computer Science and Engineering", code="CSE")
        self.dept_it = Department.objects.create(college=self.college, name="Information Technology", code="IT")
        self.other_dept = Department.objects.create(college=self.other_college, name="Other Dept", code="OTH")

        # Academic Year
        self.ay = AcademicYear.objects.create(
            college=self.college, name="2025-26", is_current=True,
            start_date="2025-06-01", end_date="2026-05-31"
        )

        # Users
        self.hod_cse = User.objects.create_user(
            email="hod.cse@demo.edu", password="password123",
            role="HOD", college=self.college, department=self.dept_cse,
            first_name="Rajesh", last_name="Kumar"
        )
        self.hod_it = User.objects.create_user(
            email="hod.it@demo.edu", password="password123",
            role="HOD", college=self.college, department=self.dept_it,
            first_name="Anand", last_name="Sharma"
        )
        self.incharge_cse = User.objects.create_user(
            email="incharge.cse@demo.edu", password="password123",
            role="DEPARTMENT_INCHARGE", college=self.college, department=self.dept_cse,
            first_name="Vikram", last_name="Joshi"
        )
        self.management_user = User.objects.create_user(
            email="management@demo.edu", password="password123",
            role="COLLEGE_MANAGEMENT", college=self.college,
            first_name="Principal", last_name="Admin"
        )
        self.iqac_user = User.objects.create_user(
            email="iqac@demo.edu", password="password123",
            role="IQAC", college=self.college,
            first_name="Suresh", last_name="Sharma"
        )

        # Report Type
        self.report_type = ReportType.objects.create(
            name="NAAC Criteria Report",
            code="NAAC_CRITERIA",
            college=self.college
        )

        # Reports: One for CSE, One for IT
        self.report_cse = GeneratedReport.objects.create(
            college=self.college,
            department=self.dept_cse,
            report_type=self.report_type,
            title="CSE Consolidated Department Report",
            output_format=ReportFormat.PDF,
            status=ReportStatus.COMPLETED,
            file=ContentFile(b"%PDF-1.4 dummy", name="cse_report.pdf"),
            file_size=1024,
            record_count=5,
            generated_by=self.incharge_cse,
            filters_applied={"submitted_to_hod": True, "incharge_name": "Vikram Joshi"}
        )

        self.report_it = GeneratedReport.objects.create(
            college=self.college,
            department=self.dept_it,
            report_type=self.report_type,
            title="IT Consolidated Department Report",
            output_format=ReportFormat.PDF,
            status=ReportStatus.COMPLETED,
            file=ContentFile(b"%PDF-1.4 dummy", name="it_report.pdf"),
            file_size=2048,
            record_count=8,
            filters_applied={"submitted_to_hod": True}
        )

        self.client_hod_cse = APIClient()
        self.client_hod_cse.force_authenticate(user=self.hod_cse)

        self.client_hod_it = APIClient()
        self.client_hod_it.force_authenticate(user=self.hod_it)

    def test_hod_reports_department_isolation(self):
        """HOD only sees reports belonging to their department."""
        res_cse = self.client_hod_cse.get("/api/v1/reports/hod-reports/")
        self.assertEqual(res_cse.status_code, status.HTTP_200_OK)
        ids_cse = [r["id"] for r in res_cse.data["results"]]
        self.assertIn(str(self.report_cse.id), ids_cse)
        self.assertNotIn(str(self.report_it.id), ids_cse)

        res_it = self.client_hod_it.get("/api/v1/reports/hod-reports/")
        self.assertEqual(res_it.status_code, status.HTTP_200_OK)
        ids_it = [r["id"] for r in res_it.data["results"]]
        self.assertIn(str(self.report_it.id), ids_it)
        self.assertNotIn(str(self.report_cse.id), ids_it)

    def test_hod_download_marks_report_and_enforces_isolation(self):
        """HOD download endpoint marks report as downloaded by HOD and enforces isolation."""
        # CSE HOD downloads CSE report -> success
        res = self.client_hod_cse.post(f"/api/v1/reports/{self.report_cse.id}/hod-download/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.report_cse.refresh_from_db()
        self.assertTrue(self.report_cse.filters_applied.get("hod_downloaded"))

        # IT HOD attempts to download CSE report -> 403 Forbidden
        res_cross = self.client_hod_it.post(f"/api/v1/reports/{self.report_cse.id}/hod-download/")
        self.assertEqual(res_cross.status_code, status.HTTP_403_FORBIDDEN)

    def test_hod_submit_to_admins_flow(self):
        """HOD submits report to admins: dispatches to Management (Admin2) and IQAC (Admin3)."""
        res = self.client_hod_cse.post(f"/api/v1/reports/{self.report_cse.id}/submit-to-admins/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.report_cse.refresh_from_db()
        self.assertTrue(self.report_cse.filters_applied.get("submitted_to_admins"))
        self.assertEqual(self.report_cse.filters_applied.get("submitted_by_hod_name"), "Rajesh Kumar")

        # Verify notifications sent to Management and IQAC
        mgmt_notifs = Notification.objects.filter(recipient=self.management_user, related_id=self.report_cse.id)
        self.assertTrue(mgmt_notifs.exists())
        self.assertEqual(mgmt_notifs.first().notification_type, "HOD_ADMIN_REPORT_SUBMISSION")

        iqac_notifs = Notification.objects.filter(recipient=self.iqac_user, related_id=self.report_cse.id)
        self.assertTrue(iqac_notifs.exists())
        self.assertEqual(iqac_notifs.first().notification_type, "HOD_ADMIN_REPORT_SUBMISSION")

    def test_hod_submit_cross_department_forbidden(self):
        """HOD cannot submit reports belonging to another department."""
        res = self.client_hod_it.post(f"/api/v1/reports/{self.report_cse.id}/submit-to-admins/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
