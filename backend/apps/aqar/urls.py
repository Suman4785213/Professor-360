"""
AQAR and Compliance Workspace URLs — Phase 8
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AQARDashboardView, AQARSectionsView, EvidenceGapAnalysisView,
    DepartmentContributionsView, FacultyContributionsView,
    SourceTraceabilityView, ComplianceNarrativeViewSet,
    DataRequestViewSet, PreparationChecklistViewSet
)

router = DefaultRouter()
router.register(r'compliance/narratives', ComplianceNarrativeViewSet, basename='compliance-narratives')
router.register(r'compliance/data-requests', DataRequestViewSet, basename='compliance-data-requests')
router.register(r'aqar/checklist', PreparationChecklistViewSet, basename='aqar-checklist')

urlpatterns = [
    # Dedicated Dashboard & Analytics
    path('aqar/dashboard/', AQARDashboardView.as_view(), name='aqar-dashboard'),
    path('aqar/sections/', AQARSectionsView.as_view(), name='aqar-sections'),
    path('aqar/gap-analysis/', EvidenceGapAnalysisView.as_view(), name='aqar-gap-analysis'),
    path('aqar/department-contributions/', DepartmentContributionsView.as_view(), name='aqar-dept-contributions'),
    path('aqar/faculty-contributions/', FacultyContributionsView.as_view(), name='aqar-faculty-contributions'),
    path('compliance/traceability/', SourceTraceabilityView.as_view(), name='compliance-traceability'),

    # ViewSet Router
    path('', include(router.urls)),
]
