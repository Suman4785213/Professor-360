"""Run tests exclusively in a disposable PostgreSQL database and temporary media directory."""
import os
import sys
import tempfile
import uuid
os.environ['DEBUG'] = 'False'
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.test'
from django.conf import settings
settings.DATABASES['default']['NAME'] = 'professor360_security_runner'
settings.DATABASES['default']['TEST'] = {'NAME': 'test_p360_security_' + uuid.uuid4().hex[:12]}
settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
settings.PASSWORD_RESET_URL = 'https://example.invalid/reset-password'
import django
django.setup()
from django.test.utils import get_runner
with tempfile.TemporaryDirectory(prefix='p360_security_') as media:
    settings.MEDIA_ROOT = media
    failures = get_runner(settings)(verbosity=1, interactive=False).run_tests(sys.argv[1:] or ['apps.accounts.tests_security'])
sys.exit(bool(failures))
