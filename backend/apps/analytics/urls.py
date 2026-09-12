from django.urls import path
from .views import (
    AnalyticsOverviewView,
    ExecutiveAnalyticsView,
    IQACIntelligenceView,
    AcademicYearComparisonView,
    DepartmentComparisonView,
    FacultyParticipationView,
    EvidenceHealthView,
    VerificationPipelineView,
    EvidenceGapMatrixView,
    DataQualityView,
    AIInsightsView,
    ForecastView,
)

urlpatterns = [
    path('analytics/overview/', AnalyticsOverviewView.as_view(), name='analytics-overview'),
    path('analytics/executive/', ExecutiveAnalyticsView.as_view(), name='analytics-executive'),
    path('analytics/iqac-intelligence/', IQACIntelligenceView.as_view(), name='analytics-iqac-intelligence'),
    path('analytics/academic-year-comparison/', AcademicYearComparisonView.as_view(), name='analytics-academic-year-comparison'),
    path('analytics/department-comparison/', DepartmentComparisonView.as_view(), name='analytics-department-comparison'),
    path('analytics/faculty-participation/', FacultyParticipationView.as_view(), name='analytics-faculty-participation'),
    path('analytics/evidence-health/', EvidenceHealthView.as_view(), name='analytics-evidence-health'),
    path('analytics/verification-pipeline/', VerificationPipelineView.as_view(), name='analytics-verification-pipeline'),
    path('analytics/gap-matrix/', EvidenceGapMatrixView.as_view(), name='analytics-gap-matrix'),
    path('analytics/data-quality/', DataQualityView.as_view(), name='analytics-data-quality'),
    path('analytics/ai-insights/', AIInsightsView.as_view(), name='analytics-ai-insights'),
    path('analytics/ai-insights/refresh/', AIInsightsView.as_view(), name='analytics-ai-insights-refresh'),
    path('analytics/forecast/', ForecastView.as_view(), name='analytics-forecast'),
]

