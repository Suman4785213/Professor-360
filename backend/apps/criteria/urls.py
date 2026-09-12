"""
Criteria app URL configuration — Phase 5
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FrameworkViewSet,
    CriterionViewSet,
    MetricViewSet,
    EvidenceRequirementViewSet,
    EvidenceMappingViewSet,
)

router = DefaultRouter()
router.register(r'frameworks', FrameworkViewSet, basename='framework')
router.register(r'criteria', CriterionViewSet, basename='criterion')
router.register(r'metrics', MetricViewSet, basename='metric')
router.register(r'evidence-requirements', EvidenceRequirementViewSet, basename='evidencerequirement')
router.register(r'evidence-mappings', EvidenceMappingViewSet, basename='evidencemapping')

urlpatterns = [
    path('', include(router.urls)),
]
