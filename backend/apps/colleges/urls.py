"""
Colleges App — URLs
Routers for Colleges, Plans, Subscriptions, Feature Flags, Invitations, and System Health.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CollegeViewSet, PlanViewSet, SubscriptionViewSet,
    FeatureFlagViewSet, UserInvitationViewSet, SystemHealthView
)
from .billing_views import (
    BillingSubscriptionView, BillingPlanListView, BillingUsageView,
    BillingInvoiceViewSet, BillingInvoicePDFView, BillingPaymentViewSet,
    BillingCheckoutView, BillingPlanChangeView, BillingCancelView,
    BillingPauseResumeView, BillingWebhookView, BillingSupportTicketViewSet,
    AdminBillingDashboardView, AdminFeatureOverrideViewSet, AdminBillingReconcileView
)

router = DefaultRouter()
router.register(r'colleges', CollegeViewSet, basename='college')
router.register(r'plans', PlanViewSet, basename='plan')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'features', FeatureFlagViewSet, basename='feature-flag')
router.register(r'feature-flags', FeatureFlagViewSet, basename='feature-flag-alt')
router.register(r'invitations', UserInvitationViewSet, basename='invitation')

# Billing viewsets
router.register(r'billing/invoices', BillingInvoiceViewSet, basename='billing-invoice')
router.register(r'billing/payments', BillingPaymentViewSet, basename='billing-payment')
router.register(r'billing/support', BillingSupportTicketViewSet, basename='billing-ticket')
router.register(r'admin/billing/overrides', AdminFeatureOverrideViewSet, basename='admin-feature-override')

urlpatterns = [
    # System health
    path('system/health/', SystemHealthView.as_view(), name='system-health'),

    # Phase 17: Commercial SaaS & Billing APIs
    path('billing/subscription/', BillingSubscriptionView.as_view(), name='billing-subscription'),
    path('billing/plans/', BillingPlanListView.as_view(), name='billing-plans'),
    path('billing/usage/', BillingUsageView.as_view(), name='billing-usage'),
    path('billing/checkout/', BillingCheckoutView.as_view(), name='billing-checkout'),
    path('billing/change-plan/', BillingPlanChangeView.as_view(), name='billing-change-plan'),
    path('billing/cancel/', BillingCancelView.as_view(), name='billing-cancel'),
    path('billing/invoices/<str:invoice_id>/pdf/', BillingInvoicePDFView.as_view(), name='billing-invoice-pdf'),
    path('billing/webhooks/', BillingWebhookView.as_view(), name='billing-webhooks'),
    path('billing/pause/', BillingPauseResumeView.as_view(), {'action': 'pause'}, name='billing-pause'),
    path('billing/resume/', BillingPauseResumeView.as_view(), {'action': 'resume'}, name='billing-resume'),
    path('billing/reactivate/', BillingPauseResumeView.as_view(), {'action': 'reactivate'}, name='billing-reactivate'),

    # Super Admin Platform Revenue & Governance
    path('admin/billing/', AdminBillingDashboardView.as_view(), name='admin-billing-dashboard'),
    path('admin/billing/reconcile/', AdminBillingReconcileView.as_view(), name='admin-billing-reconcile'),

    path('', include(router.urls)),
]
