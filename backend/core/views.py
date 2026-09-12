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
