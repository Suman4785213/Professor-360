"""Short-lived, isolated PostgreSQL fixture server for manual Android QA.

Uses existing backend/settings with random test database and temporary media.
Never seeds the normal application database. Stops on Ctrl-C, stop file, or 2h.
Prints only the temporary manifest path, never credentials or tokens.
"""
import io
import json
import os
from pathlib import Path
import secrets
import tempfile
import time
import uuid

os.environ['DEBUG'] = 'False'
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.test'
from django.conf import settings

settings.DATABASES['default']['NAME'] = 'professor360_security_runner'
test_name = 'test_p360_security_' + uuid.uuid4().hex[:12]
settings.DATABASES['default']['TEST'] = {'NAME': test_name}
settings.ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '10.0.2.2']
settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

import django
django.setup()
from django.core.files.base import ContentFile
from django.core.handlers.wsgi import WSGIHandler
from django.core.servers.basehttp import WSGIServer, WSGIRequestHandler
from django.db import connection, connections
from django.test.runner import DiscoverRunner
from apps.accounts.models import User, FacultyProfile
from apps.colleges.models import College
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.reports.models import ReportType
from pypdf import PdfWriter
from PIL import Image


def main():
    runner = DiscoverRunner(verbosity=1, interactive=False)
    old = runner.setup_databases()
    try:
        assert connection.vendor == 'postgresql'
        assert connection.settings_dict['NAME'] == test_name
        with tempfile.TemporaryDirectory(prefix='p360_security_android_') as directory:
            root = Path(directory)
            settings.MEDIA_ROOT = str(root / 'media')
            college = College.objects.create(name='Disposable Mobile QA', code='MOBILE-QA')
            dept = Department.objects.create(college=college, name='QA Department', code='QA')
            AcademicYear.objects.create(college=college, name='2026-27', is_current=True,
                start_date='2026-06-01', end_date='2027-05-31')
            ReportType.objects.create(college=college, name='Faculty report', code='FACULTY_PROFILE')
            password = secrets.token_hex(8)
            accounts = {}
            image = io.BytesIO()
            Image.new('RGB', (72, 72), '#4338ca').save(image, format='PNG')
            png = image.getvalue()
            for role in ['SUPER_ADMIN','COLLEGE_MANAGEMENT','IQAC','HOD','DEPARTMENT_INCHARGE','FACULTY']:
                user = User.objects.create_user(email=role.lower()+'@mobile.invalid', password=password,
                    first_name='Disposable', last_name=role, role=role,
                    college=None if role == 'SUPER_ADMIN' else college,
                    department=dept if role in ['FACULTY','HOD','DEPARTMENT_INCHARGE'] else None)
                accounts[role] = user.email
                if role == 'FACULTY':
                    profile, _ = FacultyProfile.objects.get_or_create(user=user, defaults={'college':college, 'department':dept})
                    profile.profile_photo.save('qa-avatar.png', ContentFile(png))
            pdf = PdfWriter(); pdf.add_blank_page(width=300, height=300)
            buf = io.BytesIO(); pdf.write(buf)
            (root/'qa-evidence.pdf').write_bytes(buf.getvalue())
            (root/'qa-evidence.png').write_bytes(png)
            with WSGIServer(('127.0.0.1', 8765), WSGIRequestHandler) as server:
                server.set_app(WSGIHandler())  # No development/static media bypass.
                server.timeout = 1
                manifest = root/'fixture.json'
                manifest.write_text(json.dumps({'password':password,'accounts':accounts,
                    'college':str(college.pk),'database':test_name,'base':'http://10.0.2.2:8765/api/v1/',
                    'stop_file':str(root/'stop'),'pdf':str(root/'qa-evidence.pdf'),'image':str(root/'qa-evidence.png')}))
                print('ANDROID_FIXTURE_READY ' + str(manifest), flush=True)
                deadline = time.monotonic()+7200
                while time.monotonic()<deadline and not (root/'stop').exists():
                    server.handle_request()
    except KeyboardInterrupt:
        pass
    finally:
        connections.close_all()
        runner.teardown_databases(old)


if __name__ == '__main__':
    main()
