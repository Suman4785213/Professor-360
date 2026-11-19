"""Validate production configuration using synthetic values, without database/network access."""
import os
import secrets
import subprocess
import sys
from pathlib import Path
for s3 in ('False', 'True'):
    env = os.environ.copy()
    env.update(DEBUG='False', DJANGO_SETTINGS_MODULE='config.settings.production',
        SECRET_KEY=secrets.token_urlsafe(64), ALLOWED_HOSTS='example.invalid',
        CORS_ALLOWED_ORIGINS='https://example.invalid', CSRF_TRUSTED_ORIGINS='https://example.invalid',
        USE_S3=s3, AWS_ACCESS_KEY_ID='test-only', AWS_SECRET_ACCESS_KEY='test-only',
        AWS_STORAGE_BUCKET_NAME='test-only-private', DATABASE_URL='', REDIS_URL='',
        DB_NAME='production_settings_validation_only', DB_HOST='127.0.0.1', DB_PORT='1')
    result = subprocess.run([sys.executable, '-B', 'manage.py', 'check', '--deploy'],
        env=env, cwd=Path(__file__).parent, capture_output=True, text=True)
    print('Production settings ' + ('S3' if s3 == 'True' else 'local') + ': ' + ('PASS' if result.returncode == 0 else 'FAIL'))
    # Only system-check diagnostics; never dump environment/settings.
    diagnostics = result.stdout + result.stderr
    import re
    codes = sorted(set(re.findall(r'\(([^() ]+\.W[0-9]+)\)', diagnostics)))
    print('Warning codes: ' + ', '.join(codes))
    if result.returncode: print(diagnostics)
    if result.returncode:
        sys.exit(result.returncode)
