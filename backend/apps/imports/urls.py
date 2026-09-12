"""
URL Patterns for Imports and Integrations (Phase 14)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.imports.views import (
    ImportJobViewSet,
    ImportTemplateViewSet,
    DownloadTemplateView,
    ControlledExportView,
    APIKeyViewSet,
    WebhookViewSet,
    AISuggestMappingView,
    IntegrationV1APIView,
)

router = DefaultRouter()
router.register(r'jobs', ImportJobViewSet, basename='import-jobs')
router.register(r'saved-templates', ImportTemplateViewSet, basename='import-templates')
router.register(r'api-keys', APIKeyViewSet, basename='api-keys')
router.register(r'webhooks', WebhookViewSet, basename='webhooks')

urlpatterns = [
    path('templates/<str:data_type>/', DownloadTemplateView.as_view(), name='download-template'),
    path('export/', ControlledExportView.as_view(), name='controlled-export'),
    path('ai-suggest-mapping/', AISuggestMappingView.as_view(), name='ai-suggest-mapping'),
    path('v1/<str:resource>/', IntegrationV1APIView.as_view(), name='integration-v1'),
    path('', include(router.urls)),
]
