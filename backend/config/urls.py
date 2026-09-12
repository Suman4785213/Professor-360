"""
IQAC Management System — URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from core.views import health_check_view, HealthCheckAPIView

api_v1_patterns = [
    path('health/', HealthCheckAPIView.as_view(), name='api-v1-health-check'),
    path('auth/', include('apps.accounts.urls')),
    path('', include('apps.colleges.urls')),
    path('', include('apps.departments.urls')),
    path('', include('apps.programs.urls')),
    path('', include('apps.academic_years.urls')),
    path('', include('apps.activities.urls')),
    path('', include('apps.verification.urls')),
    path('', include('apps.evidence.urls')),
    path('', include('apps.criteria.urls')),
    path('', include('apps.reports.urls')),
    path('', include('apps.aqar.urls')),
    path('', include('apps.ssr.urls')),
    path('', include('apps.notifications.urls')),
    path('', include('apps.analytics.urls')),
    path('audit/', include('apps.audit.urls')),
    path('ai/', include('apps.ai.urls')),
    path('imports/', include('apps.imports.urls')),
    path('integrations/', include('apps.integrations.urls')),
    path('integrations/', include('apps.imports.urls')),
    path('support/', include('apps.support.urls')),
    path('', include('apps.support.urls')),
]

urlpatterns = [
    # Top-level health checks (for load balancers & container healthcheck)
    path('health/', health_check_view, name='health-check'),
    path('api/health/', HealthCheckAPIView.as_view(), name='api-health-check'),

    # Django admin
    path('django-admin/', admin.site.urls),

    # API endpoints (support both /api/v1/ and /api/)
    path('api/v1/', include(api_v1_patterns)),
    path('api/', include(api_v1_patterns)),

    # OpenAPI schema & docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
