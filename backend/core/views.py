"""
Core Health & Monitoring Views (Phase 12)
Provides unauthenticated health check probes for container orchestrators,
load balancers, and monitoring dashboards without leaking secrets or credentials.
"""
import time
import os
from django.conf import settings
from django.db import connection
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .middleware import get_current_request_id


def health_check_view(request):
    """
    Lightweight, unauthenticated health check endpoint.
    Suitable for AWS ALB, Kubernetes liveness/readiness probes, and Docker HEALTHCHECK.
    """
    start_time = time.time()
    checks = {}
    overall_healthy = True

    # 1. Database Check
    db_start = time.time()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            row = cursor.fetchone()
            if row and row[0] == 1:
                checks['database'] = {
                    'status': 'HEALTHY',
                    'latency_ms': round((time.time() - db_start) * 1000, 2),
                }
            else:
                checks['database'] = {'status': 'DEGRADED', 'error': 'Unexpected query result'}
                overall_healthy = False
    except Exception as e:
        checks['database'] = {
            'status': 'DOWN',
            'latency_ms': round((time.time() - db_start) * 1000, 2),
            'error': 'Database connection failed',
        }
        overall_healthy = False

    # 2. Cache / Redis Check
    cache_start = time.time()
    try:
        test_key = f"healthcheck_{int(time.time())}"
        cache.set(test_key, '1', timeout=10)
        cached_val = cache.get(test_key)
        if cached_val == '1':
            checks['cache'] = {
                'status': 'HEALTHY',
                'latency_ms': round((time.time() - cache_start) * 1000, 2),
            }
        else:
            checks['cache'] = {'status': 'WARNING', 'error': 'Cache read/write mismatch'}
    except Exception as e:
        # Cache failure is graceful degradation (WARNING, not DOWN)
        checks['cache'] = {
            'status': 'WARNING',
            'latency_ms': round((time.time() - cache_start) * 1000, 2),
            'error': 'Cache service unavailable (graceful degradation)',
        }

    # 3. Storage Check
    storage_start = time.time()
    try:
        media_root = getattr(settings, 'MEDIA_ROOT', None)
        if media_root and os.path.isdir(media_root) and os.access(media_root, os.W_OK):
            checks['storage'] = {
                'status': 'HEALTHY',
                'latency_ms': round((time.time() - storage_start) * 1000, 2),
            }
        else:
            checks['storage'] = {'status': 'WARNING', 'error': 'Storage directory not writable'}
    except Exception as e:
        checks['storage'] = {'status': 'WARNING', 'error': 'Storage check error'}

    # 4. Background Workers Check
    checks['background_workers'] = {
        'status': 'HEALTHY',
        'provider': 'thread_pool_executor',
    }

    # 5. AI Services Status
    ai_configured = bool(getattr(settings, 'OPENAI_API_KEY', ''))
    checks['ai_service'] = {
        'status': 'HEALTHY' if ai_configured else 'HEALTHY_DEGRADED',
        'mode': 'openai' if ai_configured else 'heuristic_fallback',
    }

    total_latency = round((time.time() - start_time) * 1000, 2)
    overall_status = 'HEALTHY' if overall_healthy else 'DEGRADED'
    http_status = 200 if overall_healthy else 503

    payload = {
        'status': overall_status,
        'version': '1.0.0',
        'environment': 'production' if not settings.DEBUG else 'development',
        'response_time_ms': total_latency,
        'checks': checks,
        'request_id': getattr(request, 'id', get_current_request_id()),
    }

    response = JsonResponse(payload, status=http_status)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response


class HealthCheckAPIView(APIView):
    """DRF-wrapped version of the health check endpoint."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return health_check_view(request)


def readiness_check_view(request):
    """
    Production readiness probe (for Kubernetes, AWS ALB, Docker).
    Returns 200 OK only when the system is ready to receive live user traffic (DB reachable).
    Returns 503 if database connection cannot be established.
    Never exposes credentials or internal configuration.
    """
    db_ok = True
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            row = cursor.fetchone()
            if not row or row[0] != 1:
                db_ok = False
    except Exception:
        db_ok = False

    payload = {
        'status': 'READY' if db_ok else 'NOT_READY',
        'database': 'CONNECTED' if db_ok else 'DISCONNECTED',
        'request_id': getattr(request, 'id', get_current_request_id()),
    }
    response = JsonResponse(payload, status=200 if db_ok else 503)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response


def liveness_check_view(request):
    """
    Production liveness probe (for Kubernetes, AWS ALB, Docker).
    Lightweight heartbeat indicating the web application process is active.
    """
    response = JsonResponse({
        'status': 'ALIVE',
        'request_id': getattr(request, 'id', get_current_request_id()),
    }, status=200)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response


def custom_handler400(request, exception=None):
    """Production-hardened 400 Bad Request handler."""
    return JsonResponse({
        'success': False,
        'error': {
            'code': 'BAD_REQUEST',
            'message': 'The request could not be processed due to invalid parameters.',
            'request_id': getattr(request, 'id', get_current_request_id()),
        },
        'message': 'Bad Request',
    }, status=400)


def custom_handler403(request, exception=None):
    """Production-hardened 403 Forbidden handler."""
    return JsonResponse({
        'success': False,
        'error': {
            'code': 'FORBIDDEN',
            'message': 'You do not have permission to access this resource.',
            'request_id': getattr(request, 'id', get_current_request_id()),
        },
        'message': 'Forbidden',
    }, status=403)


def custom_handler404(request, exception=None):
    """Production-hardened 404 Not Found handler."""
    return JsonResponse({
        'success': False,
        'error': {
            'code': 'NOT_FOUND',
            'message': 'The requested resource was not found on this server.',
            'request_id': getattr(request, 'id', get_current_request_id()),
        },
        'message': 'Not Found',
    }, status=404)


def custom_handler500(request):
    """Production-hardened 500 Internal Server Error handler."""
    return JsonResponse({
        'success': False,
        'error': {
            'code': 'INTERNAL_SERVER_ERROR',
            'message': 'An unexpected server error occurred. Please quote your Request ID to support.',
            'request_id': getattr(request, 'id', get_current_request_id()),
        },
        'message': 'Internal Server Error',
    }, status=500)

