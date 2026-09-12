"""
URLs for External Integrations & Communication — Phase 16
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.integrations.views import (
    IntegrationHealthView,
    AnnouncementViewSet,
    EmailDeliveryLogViewSet,
    EmailTemplateViewSet,
    SSOConfigurationView,
    CalendarExportView,
    StorageMigrationViewSet,
    IncomingWebhookView,
)

router = DefaultRouter()
router.register('announcements', AnnouncementViewSet, basename='announcements')
router.register('email-logs', EmailDeliveryLogViewSet, basename='email-logs')
router.register('email-templates', EmailTemplateViewSet, basename='email-templates')
router.register('storage-migrations', StorageMigrationViewSet, basename='storage-migrations')

urlpatterns = [
    path('health/', IntegrationHealthView.as_view(), name='integration-health'),
    path('sso/', SSOConfigurationView.as_view(), name='sso-config'),
    path('calendar/tasks/<uuid:task_id>/ics/', CalendarExportView.as_view(), name='calendar-task-ics'),
    path('webhooks/incoming/', IncomingWebhookView.as_view(), name='incoming-webhook'),
    path('', include(router.urls)),
]
