"""
Core Security & Observability Middlewares
- RequestIDMiddleware: Injects and propagates traceable X-Request-ID correlation IDs.
- SecurityHeadersMiddleware: Adds HSTS, CSP, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.
- MaintenanceModeMiddleware: Enables platform-wide maintenance mode with Super Admin bypass.
"""
import uuid
import threading
import logging
from django.conf import settings
from django.http import JsonResponse

logger = logging.getLogger(__name__)

# Thread-local storage for request correlation ID
_thread_locals = threading.local()


def get_current_request_id() -> str:
    """Returns the current request ID from thread-local storage, or empty string."""
    return getattr(_thread_locals, 'request_id', '')


class RequestIDMiddleware:
    """
    Ensures every inbound request has a unique, traceable correlation ID.
    Propagates the ID to logs, exception handlers, and the X-Request-ID response header.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Read incoming header or generate new ID
        incoming_id = request.headers.get('X-Request-ID') or request.META.get('HTTP_X_REQUEST_ID')
        if incoming_id and len(incoming_id) <= 64:
            # Clean incoming ID of non-alphanumeric chars
            sanitized_id = ''.join(c for c in incoming_id if c.isalnum() or c in '-_')
            request_id = sanitized_id or f"REQ-{uuid.uuid4().hex[:12].upper()}"
        else:
            request_id = f"REQ-{uuid.uuid4().hex[:12].upper()}"

        request.id = request_id
        _thread_locals.request_id = request_id

        response = self.get_response(request)
        response['X-Request-ID'] = request_id
        return response


class SecurityHeadersMiddleware:
    """
    Injects production-grade HTTP security headers on all responses.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Standard OWASP recommended security headers
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('X-Frame-Options', 'SAMEORIGIN')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.setdefault(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=()'
        )

        # Content Security Policy (allows necessary CDNs for fonts and scripts while restricting execution)
        csp_header = getattr(settings, 'CONTENT_SECURITY_POLICY', None)
        if csp_header:
            response.headers.setdefault('Content-Security-Policy', csp_header)

        # Strict-Transport-Security (HSTS) when SSL is enabled
        if getattr(settings, 'SECURE_HSTS_SECONDS', 0) > 0 and request.is_secure():
            hsts_parts = [f"max-age={settings.SECURE_HSTS_SECONDS}"]
            if getattr(settings, 'SECURE_HSTS_INCLUDE_SUBDOMAINS', False):
                hsts_parts.append("includeSubDomains")
            if getattr(settings, 'SECURE_HSTS_PRELOAD', False):
                hsts_parts.append("preload")
            response.headers.setdefault('Strict-Transport-Security', '; '.join(hsts_parts))

        return response


class MaintenanceModeMiddleware:
    """
    Intercepts non-exempt requests when MAINTENANCE_MODE is set to True.
    Allows Super Admins and health check probes to bypass.
    """
    EXEMPT_PATHS = (
        '/health/',
        '/api/health/',
        '/api/v1/health/',
        '/api/v1/auth/login/',
        '/api/auth/login/',
        '/admin/',
        '/api/admin/',
        '/api/v1/admin/',
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            from apps.support.services import MaintenanceModeService
            is_maintenance = MaintenanceModeService.is_enabled()
        except Exception:
            is_maintenance = getattr(settings, 'MAINTENANCE_MODE', False)

        if not is_maintenance:
            return self.get_response(request)

        # Check path exemption
        for path in self.EXEMPT_PATHS:
            if request.path.startswith(path):
                return self.get_response(request)

        # Check Super Admin bypass
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            # Check DRF test client force authentication
            user = getattr(request, '_force_auth_user', None)

        if not user or not user.is_authenticated:
            # Check Bearer JWT authorization header
            auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION')
            if auth_header and auth_header.startswith('Bearer '):
                try:
                    from rest_framework_simplejwt.authentication import JWTAuthentication
                    jwt_auth = JWTAuthentication()
                    validated_token = jwt_auth.get_validated_token(auth_header.split(' ')[1])
                    user = jwt_auth.get_user(validated_token)
                    request.user = user
                except Exception:
                    pass

        if user and user.is_authenticated and getattr(user, 'role', '') == 'SUPER_ADMIN':
            return self.get_response(request)

        request_id = getattr(request, 'id', get_current_request_id())
        logger.warning(f"Request blocked due to active maintenance mode: path={request.path}, req_id={request_id}")

        data = {
            'success': False,
            'error': {
                'code': 'MAINTENANCE_MODE',
                'message': 'System maintenance in progress. Please check back shortly.',
                'request_id': request_id,
            }
        }
        response = JsonResponse(data, status=503)
        response['Retry-After'] = '300'
        if request_id:
            response['X-Request-ID'] = request_id
        return response
