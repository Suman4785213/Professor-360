"""
URLs for Reports app — Phase 6: Automated Report Generation Engine
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportTypeViewSet, ReportTemplateViewSet, ReportViewSet

router = DefaultRouter()
router.register(r'report-types', ReportTypeViewSet, basename='report-type')
router.register(r'report-templates', ReportTemplateViewSet, basename='report-template')
router.register(r'reports', ReportViewSet, basename='report')

urlpatterns = [
    path('', include(router.urls)),
]
