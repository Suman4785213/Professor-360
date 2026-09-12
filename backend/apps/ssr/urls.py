"""
SSR Workspace URLs — Phase 8
"""
from django.urls import path
from .views import SSRDashboardView, SSRReviewHistoryView

urlpatterns = [
    path('ssr/dashboard/', SSRDashboardView.as_view(), name='ssr-dashboard'),
    path('ssr/review-history/', SSRReviewHistoryView.as_view(), name='ssr-review-history'),
]
