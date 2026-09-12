"""
IQAC Management System — Test Settings
Optimized settings for fast, deterministic automated test execution.
"""
from .base import *  # noqa: F401, F403

DEBUG = False
SECRET_KEY = 'test-secret-key-for-automated-ci-test-suite-runs-only'
ALLOWED_HOSTS = ['*']

# Password validation disabled and fast MD5 hasher for test suite speed
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]
AUTH_PASSWORD_VALIDATORS = []

# Disable external email
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Memory storage for tests
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# Relax throttling during tests to prevent rate limit collisions
REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = []
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {}

# Mute noisy logs in test runner
LOGGING['handlers']['console']['level'] = 'CRITICAL'
LOGGING['loggers']['django']['level'] = 'CRITICAL'
LOGGING['loggers']['apps']['level'] = 'CRITICAL'
