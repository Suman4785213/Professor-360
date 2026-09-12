"""
IQAC Management System — Development Settings
"""
from .base import *  # noqa

DEBUG = True
ALLOWED_HOSTS = ['*']

# Default to PostgreSQL
USE_SQLITE = config('USE_SQLITE', default=False, cast=bool)

if USE_SQLITE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Show emails in console
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Relax password validation in dev
AUTH_PASSWORD_VALIDATORS = []
