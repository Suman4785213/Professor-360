"""Real Node mobile services -> loopback Django -> isolated PostgreSQL.

Run ONLY through backend/run_security_tests.py. No institutional fixtures.
"""
import json
import os
from pathlib import Path
import secrets
import subprocess

from django.conf import settings
from django.core.handlers.wsgi import WSGIHandler
from django.db import connection
from django.test import LiveServerTestCase
from apps.accounts.models import User
from apps.colleges.models import College
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.reports.models import ReportType


class MobileHTTPIntegrationTests(LiveServerTestCase):
    host = '127.0.0.1'

    @staticmethod
    def static_handler(_test_media_handler):
        # LiveServerThread otherwise inserts an unauthenticated _MediaFilesHandler.
        # Exercise the real URLconf/middleware/private-media gateway instead.
        return WSGIHandler()

    @classmethod
    def setUpClass(cls):
        # Refuse to start a server or write fixtures outside the approved runner.
        if (connection.vendor != 'postgresql' or
                not connection.settings_dict['NAME'].startswith('test_p360_security_') or
                not Path(settings.MEDIA_ROOT).name.startswith('p360_security_')):
            raise RuntimeError('Use run_security_tests.py with isolated PostgreSQL and media')
        super().setUpClass()

    def test_mobile_services_over_real_http(self):
        college = College.objects.create(name='Disposable Mobile QA', code='MOBILE-QA')
        dept = Department.objects.create(college=college, name='QA', code='QA')
        year = AcademicYear.objects.create(college=college, name='2026-27',
            start_date='2026-06-01', end_date='2027-05-31', is_current=True)
        report_type = ReportType.objects.create(college=college, name='Faculty report', code='FACULTY_PROFILE')
        password = secrets.token_urlsafe(24)
        accounts = {}
        for role in ['SUPER_ADMIN', 'COLLEGE_MANAGEMENT', 'IQAC', 'HOD', 'DEPARTMENT_INCHARGE', 'FACULTY']:
            user = User.objects.create_user(email=role.lower()+'@mobile.invalid', password=password,
                first_name='Disposable', last_name=role, role=role,
                college=None if role == 'SUPER_ADMIN' else college,
                department=dept if role in ['HOD', 'DEPARTMENT_INCHARGE', 'FACULTY'] else None)
            accounts[role] = user.email
        foreign = College.objects.create(name='Foreign QA', code='FOREIGN-QA')
        foreign_dept = Department.objects.create(college=foreign, name='Foreign', code='FOREIGN')
        other = User.objects.create_user(email='foreign@mobile.invalid', password=password,
            first_name='Foreign', last_name='QA', role='FACULTY', college=foreign, department=foreign_dept)
        env = os.environ.copy()
        env['P360_HTTP_FIXTURE'] = json.dumps(dict(base=self.live_server_url+'/api/v1/',
            password=password, accounts=accounts, college=str(college.pk), year=str(year.pk),
            report_type=str(report_type.pk), foreign_email=other.email, foreign_college=str(foreign.pk)))
        mobile = Path(__file__).resolve().parents[3] / 'mobile'
        result = subprocess.run(['node', 'node_modules/vitest/vitest.mjs', 'run',
            '--config', 'integration/vitest.config.mjs'], cwd=mobile, env=env,
            capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180)
        # Vitest tests deliberately report status only, never Axios error/config/token dumps.
        output = (result.stdout + result.stderr).encode('ascii', errors='backslashreplace').decode('ascii')
        print(output)
        self.assertEqual(result.returncode, 0, output)
