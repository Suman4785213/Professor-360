"""
URL Configuration for Support & Operations — Phase 18
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    SupportTicketViewSet,
    IncidentViewSet,
    KnowledgeBaseCategoryViewSet,
    KnowledgeBaseArticleViewSet,
    SecurityEventViewSet,
    BackgroundJobViewSet,
    AdminSearchView,
    MaintenanceModeView,
    SystemHealthDetailView,
)

router = DefaultRouter()
router.register(r'tickets', SupportTicketViewSet, basename='support-ticket')
router.register(r'incidents', IncidentViewSet, basename='incident')
router.register(r'kb/categories', KnowledgeBaseCategoryViewSet, basename='kb-category')
router.register(r'kb/articles', KnowledgeBaseArticleViewSet, basename='kb-article')
router.register(r'security/events', SecurityEventViewSet, basename='security-event')
router.register(r'admin/jobs', BackgroundJobViewSet, basename='admin-job')

urlpatterns = [
    path('admin/search/', AdminSearchView.as_view(), name='admin-search'),
    path('admin/maintenance/', MaintenanceModeView.as_view(), name='admin-maintenance'),
    path('admin/system-health/', SystemHealthDetailView.as_view(), name='admin-system-health-detail'),
    path('', include(router.urls)),
]
