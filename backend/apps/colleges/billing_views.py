"""
Colleges App — Billing & SaaS Commercial API Views (Phase 17)
REST API endpoints for tenant subscriptions, plan comparisons, usage quotas,
invoices, payment transactions, checkout, webhooks, safe downgrade checks,
billing support tickets, and Super Admin revenue analytics.
"""
from decimal import Decimal
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from drf_spectacular.utils import extend_schema, OpenApiParameter

from core.permissions import IsSuperAdmin, IsAuthorizedBillingUser
from apps.audit.utils import log_action
from apps.accounts.models import User, UserRole
from .models import (
    College, Plan, Subscription, SubscriptionStatus, BillingCycle,
    Invoice, InvoiceStatus, PaymentTransaction, PaymentStatus,
    AdminFeatureOverride, BillingSupportTicket, BillingTicketStatus,
    BillingWebhookLog
)
from .serializers import (
    PlanSerializer, SubscriptionSerializer, InvoiceSerializer,
    PaymentTransactionSerializer, AdminFeatureOverrideSerializer,
    BillingSupportTicketSerializer
)
from .services import FeatureAccessService, EntitlementService, UsageLimitService, RevenueAnalyticsService
from .billing import BillingService, MockPaymentProvider


def _get_target_college(request) -> College:
    """Helper to resolve college tenant with Super Admin impersonation support."""
    if request.user.role == UserRole.SUPER_ADMIN:
        college_id = request.query_params.get('college_id') or request.data.get('college_id')
        if college_id:
            college = College.objects.filter(id=college_id, is_deleted=False).first()
            if college:
                return college
    return request.user.college


class BillingSubscriptionView(APIView):
    """
    Returns active subscription, trial countdown, grace period status,
    usage meters, and feature entitlements for the current college tenant.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Get Tenant Billing Subscription & Entitlements")
    def get(self, request):
        college = _get_target_college(request)
        if not college:
            return Response({'error': 'No college tenant associated with user.'}, status=status.HTTP_400_BAD_REQUEST)

        sub = college.active_subscription
        sub_data = SubscriptionSerializer(sub).data if sub else None
        entitlements = EntitlementService.get_entitlements(college)
        usage = UsageLimitService.get_usage_summary(college)

        return Response({
            'college_id': str(college.id),
            'college_name': college.name,
            'college_code': college.code,
            'subscription': sub_data,
            'entitlements': entitlements,
            'usage': usage,
            'soft_warnings': usage.get('soft_warnings', []),
            'is_in_grace_period': sub.is_in_grace_period if sub else False,
            'is_restricted': sub.is_restricted if sub else False,
            'trial_days_remaining': sub.trial_days_remaining if sub else 0,
        })


class BillingPlanListView(APIView):
    """
    Lists available SaaS plans with actual configured limits, pricing, and feature allocations.
    Accessible to all authenticated users for plan comparison.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="List SaaS Plans & Comparison Matrix")
    def get(self, request):
        plans = Plan.objects.filter(is_active=True).order_by('price_monthly')
        serializer = PlanSerializer(plans, many=True)

        current_plan_code = None
        college = getattr(request.user, 'college', None)
        if college and college.active_subscription:
            current_plan_code = college.active_subscription.plan.code

        return Response({
            'current_plan_code': current_plan_code,
            'plans': serializer.data
        })


class BillingUsageView(APIView):
    """
    Returns granular usage vs quota metrics with soft warning indicators (70%, 80%, 90%, 100%).
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Get Granular Tenant Quota Usage & Soft Warnings")
    def get(self, request):
        college = _get_target_college(request)
        if not college:
            return Response({'error': 'No college tenant found.'}, status=status.HTTP_400_BAD_REQUEST)

        summary = UsageLimitService.get_usage_summary(college)
        return Response(summary)


class BillingInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Tenant invoice history and receipts.
    Strict tenant isolation: College A cannot view College B's invoices.
    """
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthorizedBillingUser]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Invoice.objects.none()
        if user.role == UserRole.SUPER_ADMIN:
            college_id = self.request.query_params.get('college_id')
            if college_id:
                return Invoice.objects.filter(college_id=college_id).order_by('-issue_date')
            return Invoice.objects.all().order_by('-issue_date')
        if user.college:
            return Invoice.objects.filter(college=user.college).order_by('-issue_date')
        return Invoice.objects.none()


class BillingInvoicePDFView(APIView):
    """
    Downloads/views formatted invoice receipt payload.
    """
    permission_classes = [IsAuthorizedBillingUser]

    def get(self, request, invoice_id):
        user = request.user
        qs = Invoice.objects.all() if user.role == UserRole.SUPER_ADMIN else Invoice.objects.filter(college=user.college)
        invoice = qs.filter(id=invoice_id).first()
        if not invoice:
            invoice = qs.filter(invoice_number=invoice_id).first()

        if not invoice:
            return Response({'error': 'Invoice not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'invoice_number': invoice.invoice_number,
            'college_name': invoice.college.name,
            'college_code': invoice.college.code,
            'plan_name': invoice.subscription.plan.name if invoice.subscription else "SaaS Plan",
            'issue_date': invoice.issue_date.isoformat(),
            'due_date': invoice.due_date.isoformat(),
            'paid_at': invoice.paid_at.isoformat() if invoice.paid_at else None,
            'amount': float(invoice.amount),
            'tax_name': invoice.tax_name,
            'tax_rate': float(invoice.tax_rate),
            'tax_amount': float(invoice.tax_amount),
            'total_amount': float(invoice.total_amount),
            'currency': invoice.currency,
            'status': invoice.status,
            'payment_instructions': "Please transfer via NEFT/RTGS or use our online checkout portal.",
        })


class BillingPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Tenant payment transaction history.
    Strictly prevents credential leakage.
    """
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthorizedBillingUser]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return PaymentTransaction.objects.none()
        if user.role == UserRole.SUPER_ADMIN:
            college_id = self.request.query_params.get('college_id')
            if college_id:
                return PaymentTransaction.objects.filter(college_id=college_id).order_by('-created_at')
            return PaymentTransaction.objects.all().order_by('-created_at')
        if user.college:
            return PaymentTransaction.objects.filter(college=user.college).order_by('-created_at')
        return PaymentTransaction.objects.none()


class BillingCheckoutView(APIView):
    """
    Initiates subscription checkout or upgrade session via payment provider adapter.
    """
    permission_classes = [IsAuthorizedBillingUser]

    @extend_schema(summary="Initiate Hosted or Tokenized Checkout")
    def post(self, request):
        college = _get_target_college(request)
        if not college:
            return Response({'error': 'No college tenant specified.'}, status=status.HTTP_400_BAD_REQUEST)

        plan_id = request.data.get('plan_id')
        plan_code = request.data.get('plan_code')
        cycle = request.data.get('billing_cycle', BillingCycle.YEARLY)

        plan = None
        if plan_id:
            plan = Plan.objects.filter(id=plan_id, is_active=True).first()
        elif plan_code:
            plan = Plan.objects.filter(code=plan_code, is_active=True).first()

        if not plan:
            return Response({'error': 'Invalid or inactive plan selected.'}, status=status.HTTP_400_BAD_REQUEST)

        billing_service = BillingService()
        checkout_res = billing_service.create_checkout_session(college, plan, cycle=cycle, actor=request.user)

        return Response(checkout_res, status=status.HTTP_200_OK)


class BillingPlanChangeView(APIView):
    """
    Directly updates or safely downgrades subscription plan.
    Enforces non-destructive data policy: returns warnings if usage exceeds new plan limits.
    """
    permission_classes = [IsAuthorizedBillingUser]

    @extend_schema(summary="Change/Upgrade/Downgrade Subscription Plan")
    def post(self, request):
        college = _get_target_college(request)
        if not college:
            return Response({'error': 'No college tenant found.'}, status=status.HTTP_400_BAD_REQUEST)

        plan_id = request.data.get('plan_id')
        plan_code = request.data.get('plan_code')

        plan = None
        if plan_id:
            plan = Plan.objects.filter(id=plan_id, is_active=True).first()
        elif plan_code:
            plan = Plan.objects.filter(code=plan_code, is_active=True).first()

        if not plan:
            return Response({'error': 'Invalid or inactive plan specified.'}, status=status.HTTP_400_BAD_REQUEST)

        billing_service = BillingService()
        sub, warnings = billing_service.change_plan(college, plan, actor=request.user)

        return Response({
            'success': True,
            'message': f"Successfully updated subscription to {plan.name}.",
            'subscription': SubscriptionSerializer(sub).data,
            'warnings': warnings,
        }, status=status.HTTP_200_OK)


class BillingCancelView(APIView):
    """
    Cancels tenant subscription immediately or at period end.
    CRITICAL: Preserves all institutional records, evidence, and audit logs.
    """
    permission_classes = [IsAuthorizedBillingUser]

    @extend_schema(summary="Cancel Subscription with Data Preservation")
    def post(self, request):
        college = _get_target_college(request)
        if not college or not college.active_subscription:
            return Response({'error': 'No active subscription found to cancel.'}, status=status.HTTP_400_BAD_REQUEST)

        immediate = bool(request.data.get('immediate', False))
        billing_service = BillingService()
        sub = billing_service.cancel_subscription(college.active_subscription, immediate=immediate, actor=request.user)

        return Response({
            'success': True,
            'message': (
                f"Subscription cancelled {'immediately' if immediate else 'at period end'}. "
                f"All institutional data and records remain completely preserved."
            ),
            'subscription': SubscriptionSerializer(sub).data
        })


class BillingPauseResumeView(APIView):
    """
    Pauses or resumes an active subscription.
    """
    permission_classes = [IsAuthorizedBillingUser]

    def post(self, request, action):
        college = _get_target_college(request)
        if not college or not college.active_subscription:
            return Response({'error': 'No active subscription found.'}, status=status.HTTP_400_BAD_REQUEST)

        billing_service = BillingService()
        sub = college.active_subscription

        if action == 'pause':
            sub = billing_service.pause_subscription(sub, actor=request.user)
            msg = "Subscription paused successfully."
        elif action == 'resume':
            sub = billing_service.resume_subscription(sub, actor=request.user)
            msg = "Subscription resumed successfully."
        elif action == 'reactivate':
            sub = billing_service.reactivate_subscription(sub, actor=request.user)
            msg = "Subscription reactivated successfully."
        else:
            return Response({'error': f"Unknown action '{action}'."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'message': msg,
            'subscription': SubscriptionSerializer(sub).data
        })


class BillingWebhookView(APIView):
    """
    Inbound payment provider webhook receiver.
    Verifies HMAC-SHA256 signature, enforces 5-minute replay attack defense,
    and performs idempotent processing via BillingWebhookLog.
    """
    permission_classes = [AllowAny]

    @extend_schema(summary="Receive and Process Payment Provider Webhooks")
    def post(self, request):
        event_id = request.headers.get('X-Event-ID') or request.data.get('event_id')
        event_type = request.headers.get('X-Event-Type') or request.data.get('event_type')
        signature = request.headers.get('X-Signature') or request.headers.get('X-IQAC-Signature') or ""
        timestamp = request.headers.get('X-Timestamp') or request.headers.get('X-IQAC-Timestamp') or ""

        if not event_id or not event_type:
            return Response({'error': 'Missing event_id or event_type in webhook headers/payload.'}, status=status.HTTP_400_BAD_REQUEST)

        payload = request.data
        billing_service = BillingService()
        success, message = billing_service.handle_webhook(
            event_id=event_id,
            event_type=event_type,
            payload=payload,
            signature=signature,
            timestamp=timestamp,
            headers=dict(request.headers)
        )

        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'status': 'received', 'message': message}, status=status.HTTP_200_OK)


class BillingSupportTicketViewSet(viewsets.ModelViewSet):
    """
    Billing support queries linked directly to IQACTask / notification architecture.
    """
    serializer_class = BillingSupportTicketSerializer
    permission_classes = [IsAuthorizedBillingUser]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return BillingSupportTicket.objects.none()
        if user.role == UserRole.SUPER_ADMIN:
            return BillingSupportTicket.objects.all().order_by('-created_at')
        if user.college:
            return BillingSupportTicket.objects.filter(college=user.college).order_by('-created_at')
        return BillingSupportTicket.objects.none()

    def perform_create(self, serializer):
        college = self.request.user.college
        if not college and self.request.user.role == UserRole.SUPER_ADMIN:
            college_id = self.request.data.get('college')
            college = College.objects.filter(id=college_id).first()

        ticket = serializer.save(college=college, created_by=self.request.user)

        # Create linked IQACTask for operations tracking
        try:
            from apps.notifications.models import IQACTask
            task = IQACTask.objects.create(
                college=college,
                title=f"Billing Support: {ticket.subject}",
                description=f"Ticket #{str(ticket.id)[:8]} ({ticket.ticket_type}):\n{ticket.message}",
                created_by=self.request.user,
                priority='HIGH',
                due_date=(timezone.now() + timezone.timedelta(days=2)).date(),
            )
            ticket.task = task
            ticket.save(update_fields=['task'])
        except Exception:
            pass

        log_action(
            actor=self.request.user,
            action='BILLING_TICKET_CREATED',
            instance=ticket,
            college=college,
            comment=f"Created billing ticket '{ticket.subject}'."
        )


class AdminBillingDashboardView(APIView):
    """
    Super Admin commercial revenue analytics dashboard.
    Shows MRR, ARR, active subscriptions, trials, churn, plan distribution,
    and payment success rate without inventing fake numbers.
    """
    permission_classes = [IsSuperAdmin]

    @extend_schema(summary="Super Admin Platform Revenue Analytics")
    def get(self, request):
        metrics = RevenueAnalyticsService.get_revenue_metrics()
        return Response(metrics)


class AdminFeatureOverrideViewSet(viewsets.ModelViewSet):
    """
    Super Admin temporary manual feature override manager.
    Enforces mandatory business reasons and expiry dates; every action is audited.
    """
    serializer_class = AdminFeatureOverrideSerializer
    permission_classes = [IsSuperAdmin]
    queryset = AdminFeatureOverride.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        override = serializer.save(created_by=self.request.user)
        log_action(
            actor=self.request.user,
            action='FEATURE_OVERRIDE_CREATED',
            instance=override,
            college=override.college,
            comment=(
                f"Granted temporary feature override '{override.feature_key}' "
                f"to {override.college.name} until {override.valid_until}. Reason: {override.reason}"
            )
        )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        log_action(
            actor=self.request.user,
            action='FEATURE_OVERRIDE_REVOKED',
            instance=instance,
            college=instance.college,
            comment=f"Revoked temporary feature override '{instance.feature_key}' for {instance.college.name}."
        )


class AdminBillingReconcileView(APIView):
    """
    Subscription reconciliation tool comparing local DB state vs payment provider.
    Flags mismatches without destructive modification.
    """
    permission_classes = [IsSuperAdmin]

    @extend_schema(summary="Reconcile Subscriptions with Payment Provider")
    def get(self, request):
        billing_service = BillingService()
        active_subs = Subscription.objects.filter(status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE])

        results = []
        matches = 0
        mismatches = 0
        unknowns = 0

        for sub in active_subs:
            audit = billing_service.reconcile_subscription(sub)
            results.append(audit)
            if audit['reconciliation_status'] == 'MATCH':
                matches += 1
            elif audit['reconciliation_status'] == 'MISMATCH':
                mismatches += 1
            else:
                unknowns += 1

        return Response({
            'total_audited': len(results),
            'matches': matches,
            'mismatches': mismatches,
            'unknowns': unknowns,
            'results': results,
            'audited_at': timezone.now().isoformat(),
        })
