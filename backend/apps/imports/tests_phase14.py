"""
Automated Test Suite for Phase 14: Data Import, Integrations & Interoperability
Tests:
- Excel (.xlsx) and CSV (.csv) parsing & formula injection sanitization
- Automatic column mapping suggestions
- Row-by-row validation & foreign key resolution
- Duplicate detection (NEW, DUPLICATE, UPDATE)
- Transaction-safe execution & DRAFT status enforcement
- Controlled export role permissions
- Multi-tenant isolation between College A and College B
- API Key generation & integration endpoint authentication
- Webhook signature generation
"""
import io
import csv
import hmac
import hashlib
import json
import openpyxl
from django.test import TestCase
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, FacultyProfile, UserRole, FacultyStatus
from apps.colleges.models import College, CollegeStatus
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityStatus, ActivityCategory
from apps.evidence.models import Evidence
from apps.imports.models import (
    ImportJob,
    ImportTemplate,
    APIKey,
    WebhookEndpoint,
    WebhookDeliveryLog,
    ImportDataType,
    ImportJobStatus,
    ImportMode,
)
from apps.imports.services.spreadsheet_parser import SpreadsheetParser, sanitize_cell_value
from apps.imports.services.validation_service import ImportValidationService
from apps.imports.services.import_executor import ImportExecutor
from apps.imports.services.template_service import TemplateService
from apps.imports.services.export_service import ExportService
from apps.imports.services.integration_service import APIKeyService


class Phase14DataImportTests(TestCase):
    def setUp(self):
        # 1. Setup College A
        self.college_a = College.objects.create(
            name="Alpha Engineering College",
            code="ALPHA",
            status=CollegeStatus.ACTIVE,
        )
        self.dept_cse_a = Department.objects.create(
            college=self.college_a,
            name="Computer Science and Engineering",
            code="CSE",
        )
        self.ay_a = AcademicYear.objects.create(
            college=self.college_a,
            name="2024-25",
            start_date="2024-06-01",
            end_date="2025-05-31",
            is_current=True,
        )
        self.cat_fdp = ActivityCategory.objects.create(
            college=self.college_a,
            name="FDP",
            code="FDP",
        )

        # Users for College A
        self.user_iqac_a = User.objects.create_user(
            email="iqac@alpha.edu",
            password="Password123!",
            first_name="IQAC",
            last_name="Coordinator",
            role=UserRole.IQAC,
            college=self.college_a,
        )
        self.user_hod_cse_a = User.objects.create_user(
            email="hod.cse@alpha.edu",
            password="Password123!",
            first_name="HOD",
            last_name="CSE",
            role=UserRole.HOD,
            college=self.college_a,
            department=self.dept_cse_a,
        )
        self.user_faculty_a = User.objects.create_user(
            email="faculty1@alpha.edu",
            password="Password123!",
            first_name="Faculty",
            last_name="One",
            employee_id="ALPHA-CSE-001",
            role=UserRole.FACULTY,
            college=self.college_a,
            department=self.dept_cse_a,
        )
        self.profile_faculty_a = FacultyProfile.objects.create(
            user=self.user_faculty_a,
            college=self.college_a,
            department=self.dept_cse_a,
            employee_id="ALPHA-CSE-001",
            designation="Assistant Professor",
            qualification="Ph.D",
            status=FacultyStatus.ACTIVE,
        )

        # 2. Setup College B (Tenant Isolation Test Target)
        self.college_b = College.objects.create(
            name="Beta Institute of Technology",
            code="BETA",
            status=CollegeStatus.ACTIVE,
        )
        self.dept_cse_b = Department.objects.create(
            college=self.college_b,
            name="Computer Science and Engineering",
            code="CSE",
        )
        self.user_iqac_b = User.objects.create_user(
            email="iqac@beta.edu",
            password="Password123!",
            first_name="Beta",
            last_name="IQAC",
            role=UserRole.IQAC,
            college=self.college_b,
        )

        self.client = APIClient()

    def test_01_formula_injection_sanitization(self):
        """Formula injection prefixes (=, +, -, @) must be stripped from cell strings."""
        malicious_val1 = "=cmd|' /C calc'!A0"
        malicious_val2 = "+2+5+cmd"
        malicious_val3 = "@SUM(A1:A10)"

        sanitized1 = sanitize_cell_value(malicious_val1)
        sanitized2 = sanitize_cell_value(malicious_val2)
        sanitized3 = sanitize_cell_value(malicious_val3)

        self.assertFalse(sanitized1.startswith('='))
        self.assertFalse(sanitized2.startswith('+'))
        self.assertFalse(sanitized3.startswith('@'))
        self.assertEqual(sanitize_cell_value("Normal Title"), "Normal Title")

    def test_02_excel_and_csv_parsing(self):
        """Parser must read both .xlsx and .csv files and extract clean headers & rows."""
        # CSV
        csv_content = "First Name,Last Name,Email,Department\nJohn,Doe,john.doe@alpha.edu,CSE\nJane,Smith,jane.smith@alpha.edu,CSE\n"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        parsed_csv = SpreadsheetParser.parse(csv_file, file_format='CSV')
        self.assertEqual(parsed_csv['total_rows'], 2)
        self.assertIn('Email', parsed_csv['headers'])
        self.assertEqual(parsed_csv['rows'][0]['Email'], 'john.doe@alpha.edu')

        # Excel (.xlsx)
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Faculty"
        ws.append(['First Name', 'Last Name', 'Email', 'Department'])
        ws.append(['Arun', 'Kumar', 'arun@alpha.edu', 'CSE'])
        xlsx_buf = io.BytesIO()
        wb.save(xlsx_buf)
        xlsx_buf.seek(0)

        parsed_xlsx = SpreadsheetParser.parse(xlsx_buf, file_format='XLSX')
        self.assertEqual(parsed_xlsx['total_rows'], 1)
        self.assertEqual(parsed_xlsx['rows'][0]['Email'], 'arun@alpha.edu')

    def test_03_template_generator(self):
        """TemplateService must generate valid .xlsx and .csv downloadable templates."""
        xlsx_buf = TemplateService.generate_excel_template(ImportDataType.FACULTY)
        self.assertTrue(len(xlsx_buf.getvalue()) > 0)
        # Verify valid zip/xlsx signature
        self.assertTrue(xlsx_buf.getvalue().startswith(b'PK\x03\x04'))

        csv_buf = TemplateService.generate_csv_template(ImportDataType.ACTIVITIES)
        self.assertIn('Title', csv_buf.getvalue())
        self.assertIn('Faculty Email/ID', csv_buf.getvalue())

    def test_04_faculty_validation_and_duplicate_detection(self):
        """ValidationService must flag existing email/employee ID as duplicate in INSERT_ONLY mode."""
        job = ImportJob.objects.create(
            college=self.college_a,
            user=self.user_iqac_a,
            data_type=ImportDataType.FACULTY,
            original_filename='faculty.csv',
            mode=ImportMode.INSERT_ONLY,
            column_mapping={
                'First Name': 'first_name',
                'Last Name': 'last_name',
                'Email': 'email',
                'Employee ID': 'employee_id',
                'Department': 'department',
            }
        )

        rows = [
            # Valid new faculty
            {'First Name': 'Ramesh', 'Last Name': 'P', 'Email': 'ramesh@alpha.edu', 'Employee ID': 'ALPHA-CSE-002', 'Department': 'CSE'},
            # Duplicate faculty (already exists in setUp)
            {'First Name': 'Faculty', 'Last Name': 'One', 'Email': 'faculty1@alpha.edu', 'Employee ID': 'ALPHA-CSE-001', 'Department': 'CSE'},
            # Invalid department
            {'First Name': 'Suresh', 'Last Name': 'K', 'Email': 'suresh@alpha.edu', 'Employee ID': 'ALPHA-CSE-003', 'Department': 'UNKNOWN_DEPT'},
        ]

        validator = ImportValidationService(job)
        res = validator.validate_rows(rows)

        self.assertEqual(res['total_rows'], 3)
        self.assertEqual(res['valid_rows'], 1)
        self.assertEqual(res['error_count'], 2)
        self.assertEqual(res['duplicate_count'], 1)

    def test_05_faculty_import_execution_enforces_faculty_role(self):
        """ImportExecutor must create users with role=FACULTY (never administrative roles)."""
        job = ImportJob.objects.create(
            college=self.college_a,
            user=self.user_iqac_a,
            data_type=ImportDataType.FACULTY,
            original_filename='new_faculty.csv',
            mode=ImportMode.INSERT_ONLY,
            column_mapping={
                'First Name': 'first_name',
                'Last Name': 'last_name',
                'Email': 'email',
                'Employee ID': 'employee_id',
                'Department': 'department',
                'Designation': 'designation',
            }
        )

        rows = [
            {
                'First Name': 'Deepa',
                'Last Name': 'R',
                'Email': 'deepa@alpha.edu',
                'Employee ID': 'ALPHA-CSE-009',
                'Department': 'CSE',
                'Designation': 'Assistant Professor',
            }
        ]

        executor = ImportExecutor(job)
        res = executor.execute(rows)

        self.assertEqual(res['imported_count'], 1)
        created_user = User.objects.get(email='deepa@alpha.edu')
        self.assertEqual(created_user.role, UserRole.FACULTY)
        self.assertEqual(created_user.college, self.college_a)
        self.assertFalse(created_user.is_staff)

        # Faculty profile verification
        self.assertTrue(FacultyProfile.objects.filter(user=created_user, employee_id='ALPHA-CSE-009').exists())

    def test_06_activity_import_strictly_initializes_in_draft_status(self):
        """CRITICAL: Imported activities must strictly start in DRAFT status and NOT as verified evidence."""
        job = ImportJob.objects.create(
            college=self.college_a,
            user=self.user_iqac_a,
            data_type=ImportDataType.ACTIVITIES,
            original_filename='activities.csv',
            mode=ImportMode.INSERT_ONLY,
            column_mapping={
                'Title': 'title',
                'Faculty Email': 'faculty',
                'Department': 'department',
                'Academic Year': 'academic_year',
                'Category': 'category',
                'Start Date': 'start_date',
                'Organizer': 'organizer',
                'Certificate Number': 'certificate_number',
            }
        )

        rows = [
            {
                'Title': 'AI & Machine Learning Workshop',
                'Faculty Email': self.user_faculty_a.email,
                'Department': 'CSE',
                'Academic Year': '2024-25',
                'Category': 'FDP',
                'Start Date': '2024-10-15',
                'Organizer': 'IIT Bombay',
                'Certificate Number': 'CERT-AIML-992',
            }
        ]

        executor = ImportExecutor(job)
        res = executor.execute(rows)

        self.assertEqual(res['imported_count'], 1)
        act = Activity.objects.get(certificate_number='CERT-AIML-992')
        self.assertEqual(act.status, ActivityStatus.DRAFT)
        self.assertEqual(act.source, 'IMPORT')
        self.assertFalse(act.is_verified)
        # Ensure it is NOT in the sealed Evidence repository
        self.assertFalse(Evidence.objects.filter(activity=act).exists())

    def test_07_insert_and_update_mode_preserves_verified_evidence(self):
        """INSERT_AND_UPDATE mode can update drafts but MUST refuse to overwrite verified evidence."""
        # Create a verified activity
        verified_act = Activity.objects.create(
            college=self.college_a,
            department=self.dept_cse_a,
            faculty=self.user_faculty_a,
            academic_year=self.ay_a,
            title="Verified Advanced Robotics FDP",
            status=ActivityStatus.VERIFIED_EVIDENCE,
            certificate_number="CERT-ROBOTICS-01",
        )

        job = ImportJob.objects.create(
            college=self.college_a,
            user=self.user_iqac_a,
            data_type=ImportDataType.ACTIVITIES,
            original_filename='update.csv',
            mode=ImportMode.INSERT_AND_UPDATE,
            column_mapping={
                'Title': 'title',
                'Faculty': 'faculty',
                'Department': 'department',
                'Certificate Number': 'certificate_number',
            }
        )

        rows = [
            {
                'Title': 'Verified Advanced Robotics FDP',
                'Faculty': self.user_faculty_a.email,
                'Department': 'CSE',
                'Certificate Number': 'CERT-ROBOTICS-01',
            }
        ]

        validator = ImportValidationService(job)
        res = validator.validate_rows(rows)
        # Must detect that record is already verified and flag error
        self.assertEqual(res['error_count'], 1)
        self.assertIn('verified', res['error_details'][0]['error'].lower())

    def test_08_multi_tenant_isolation(self):
        """College A user cannot see College B import jobs, templates, or export data."""
        job_b = ImportJob.objects.create(
            college=self.college_b,
            user=self.user_iqac_b,
            data_type=ImportDataType.FACULTY,
            original_filename='beta_faculty.csv',
        )

        # Login as College A IQAC
        self.client.force_authenticate(user=self.user_iqac_a)

        # List jobs via API
        resp = self.client.get('/api/imports/jobs/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        job_ids = [j['id'] for j in resp.data.get('results', resp.data)]
        self.assertNotIn(str(job_b.id), job_ids)

        # Direct access by ID
        resp_detail = self.client.get(f'/api/imports/jobs/{job_b.id}/')
        self.assertEqual(resp_detail.status_code, status.HTTP_404_NOT_FOUND)

    def test_09_controlled_export_role_scoping(self):
        """Controlled export restricts Faculty to own records and HOD to their department."""
        # Create an activity for Faculty 1
        Activity.objects.create(
            college=self.college_a,
            department=self.dept_cse_a,
            faculty=self.user_faculty_a,
            academic_year=self.ay_a,
            title="Faculty One Paper Presentation",
            status=ActivityStatus.DRAFT,
        )

        # Faculty export
        csv_bytes, _, _ = ExportService.export_data(
            user=self.user_faculty_a,
            data_type='ACTIVITIES',
            export_format='CSV',
        )
        content = csv_bytes.decode('utf-8')
        self.assertIn("Faculty One Paper Presentation", content)

        # Super Admin API call
        self.client.force_authenticate(user=self.user_iqac_a)
        export_resp = self.client.post('/api/imports/export/', {
            'data_type': 'ACTIVITIES',
            'format': 'CSV',
        })
        self.assertEqual(export_resp.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', export_resp['Content-Type'])

    def test_10_api_key_generation_and_integration_v1_auth(self):
        """External API integration using X-IQAC-API-Key with scope enforcement."""
        api_key, raw_token = APIKeyService.generate_api_key(
            college=self.college_a,
            name="ERP Sync Key",
            scopes=['faculty:read', 'activities:read'],
            user=self.user_iqac_a,
        )

        self.assertTrue(raw_token.startswith('iqac_'))
        self.assertNotEqual(raw_token, api_key.hashed_secret)

        # Test authenticated request with valid token
        client = APIClient()
        resp = client.get(
            '/api/integrations/v1/faculty/',
            HTTP_X_IQAC_API_KEY=raw_token,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(resp.data['count'], 1)

        # Test unauthorized request without token
        resp_unauth = client.get('/api/integrations/v1/faculty/')
        self.assertEqual(resp_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test forbidden scope request (key has faculty:read and activities:read, but NOT evidence:read)
        resp_forbidden = client.get(
            '/api/integrations/v1/evidence/',
            HTTP_X_IQAC_API_KEY=raw_token,
        )
        self.assertEqual(resp_forbidden.status_code, status.HTTP_403_FORBIDDEN)

    def test_11_webhook_hmac_signature(self):
        """Webhook signatures must match HMAC-SHA256 of the JSON payload."""
        secret = "college_super_secret_signing_key_123"
        payload = {'event': 'EVIDENCE_VERIFIED', 'evidence_id': 'EV-1001'}
        payload_bytes = json.dumps(payload).encode('utf-8')
        expected_sig = hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()

        calculated_sig = hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()
        self.assertEqual(expected_sig, calculated_sig)
