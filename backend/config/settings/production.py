"""
IQAC Management System — Production Settings
Enterprise-hardened configuration for live deployment.
"""
from django.core.exceptions import ImproperlyConfigured
from .base import *  # noqa: F401, F403
from decouple import config, Csv

# 1. Debug is strictly disabled in production
DEBUG = False

# 2. Secret Key Validation — MUST be set via environment variable
SECRET_KEY = config('SECRET_KEY')
if not SECRET_KEY or 'insecure' in SECRET_KEY or 'change-me' in SECRET_KEY:
    raise ImproperlyConfigured(
        "CRITICAL SECURITY FAILURE: A valid, production-grade SECRET_KEY must be provided in production!"
    )

# 3. Allowed Hosts Validation — Never permit wildcard '*'
ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())
if not ALLOWED_HOSTS or '*' in ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        "CRITICAL SECURITY FAILURE: Explicit ALLOWED_HOSTS must be defined in production. Wildcards are strictly forbidden!"
    )

# 4. CORS & CSRF Hardening
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', cast=Csv())
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='', cast=Csv())
if not CSRF_TRUSTED_ORIGINS and CORS_ALLOWED_ORIGINS:
    # Safely align CSRF trusted origins with configured CORS domains
    CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)

# 5. HTTPS & SSL Hardening
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# HTTP Strict Transport Security (HSTS) — 1 year
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Cookie Security
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False  # Allows frontend SPA client to read CSRF token if required
SESSION_COOKIE_AGE = 86400 * 7  # 7 days
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# Browser Hardening Headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
X_FRAME_OPTIONS = 'DENY'

# 6. Database Production Configuration (Connection Pooling + DATABASE_URL)
DATABASE_URL = config('DATABASE_URL', default='')
if DATABASE_URL:
    import urllib.parse
    _db_url = urllib.parse.urlparse(DATABASE_URL)
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': _db_url.path.lstrip('/'),
        'USER': _db_url.username,
        'PASSWORD': _db_url.password,
        'HOST': _db_url.hostname,
        'PORT': _db_url.port or 5432,
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }

DATABASES['default']['CONN_MAX_AGE'] = config('DB_CONN_MAX_AGE', default=600, cast=int)

# 7. Redis Cache & Background Jobs (Production Tier)
REDIS_URL = config('REDIS_URL', default='')
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'IGNORE_EXCEPTIONS': True,  # Graceful fallback if Redis is temporarily unreachable
            }
        }
    }

# 8. S3 / Object Storage Integration
USE_S3 = config('USE_S3', default=False, cast=bool)
if USE_S3:
    INSTALLED_APPS += ['storages']
    AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='ap-south-1')
    AWS_DEFAULT_ACL = None
    AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'private, no-store'}
    AWS_S3_FILE_OVERWRITE = False
    AWS_QUERYSTRING_AUTH = True  # Enforce signed private URLs for evidence documents

STORAGES = {
    "default": {
        "BACKEND": "core.s3_storage.PrivateS3Storage" if USE_S3 else "core.storage.PrivateFileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# 9. Production Logging — Structured & Sensitive Data Redaction
LOGGING['handlers']['console']['level'] = 'INFO'
LOGGING['loggers']['django']['level'] = 'WARNING'
LOGGING['loggers']['apps']['level'] = 'INFO'
LOGGING['loggers'].setdefault('core', {'handlers': ['console'], 'propagate': False})['level'] = 'INFO'


# Never send password-reset credentials to plaintext or an untrusted request Host.
if PASSWORD_RESET_URL:
    from urllib.parse import urlparse
    _reset_url = urlparse(PASSWORD_RESET_URL)
    if _reset_url.scheme != 'https' or not _reset_url.netloc or _reset_url.username or _reset_url.query or _reset_url.fragment:
        raise ImproperlyConfigured('PASSWORD_RESET_URL must be a fixed HTTPS page URL without credentials, query or fragment.')
