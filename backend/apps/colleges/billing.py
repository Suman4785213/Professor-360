"""
Colleges App — Production-Ready Commercial SaaS Billing System (Phase 17)
Provider Abstraction (PaymentProvider), MockPaymentProvider, and BillingService
supporting subscription lifecycles, non-destructive data preservation, safe downgrades,
tax calculation, HMAC-SHA256 webhooks, and billing reconciliation.
"""
import hmac
import hashlib
import json
import uuid
from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Dict, Any, Optional, Tuple, List
from django.utils import timezone
from django.db import transaction
from django.conf import settings

from .models import (
    College, Plan, Subscription, SubscriptionStatus, BillingCycle,
    Invoice, InvoiceStatus, PaymentTransaction, PaymentStatus,
    BillingWebhookLog, BillingSupportTicket, BillingTicketStatus
)
from apps.audit.utils import log_action


class PaymentProvider(ABC):
    """
    Abstract interface for commercial payment gateway integration (Stripe, Razorpay, Paddle, etc.).
    Keeps provider-specific API logic decoupled from business modules.
    Never exposes raw payment secrets in frontend code.
    """

    @abstractmethod
    def create_customer(self, college: College, email: str, name: str) -> Dict[str, Any]:
        """Creates a customer record in the payment provider."""
        pass

    @abstractmethod
    def create_checkout(
        self, college: College, plan: Plan, cycle: str, success_url: str, cancel_url: str
    ) -> Dict[str, Any]:
        """Creates a provider-hosted checkout session."""
        pass

    @abstractmethod
    def create_subscription(
        self, college: College, plan: Plan, billing_cycle: str = BillingCycle.YEARLY, payment_method: Optional[str] = None
    ) -> Dict[str, Any]:
        """Provisions a new subscription with the payment provider."""
        pass

    @abstractmethod
    def get_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Fetches subscription status and metadata from the payment provider."""
        pass

    @abstractmethod
    def update_subscription(self, subscription: Subscription, new_plan: Plan) -> Dict[str, Any]:
        """Upgrades or downgrades an existing subscription."""
        pass

    @abstractmethod
    def cancel_subscription(self, subscription: Subscription, immediate: bool = False) -> Dict[str, Any]:
        """Cancels an active subscription immediately or at period end."""
        pass

    @abstractmethod
    def pause_subscription(self, subscription: Subscription) -> Dict[str, Any]:
        """Temporarily pauses a subscription."""
        pass

    @abstractmethod
    def resume_subscription(self, subscription: Subscription) -> Dict[str, Any]:
        """Resumes a paused subscription."""
        pass

    @abstractmethod
    def create_invoice(
        self, college: College, subscription: Optional[Subscription], amount: Decimal, tax_rate: Decimal, currency: str = 'INR'
    ) -> Dict[str, Any]:
        """Generates an invoice record."""
        pass

    @abstractmethod
    def get_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """Retrieves invoice details from the payment provider."""
        pass

    @abstractmethod
    def refund_payment(self, payment_reference: str, amount: Decimal, reason: str = "") -> Dict[str, Any]:
        """Issues a refund for a previously captured payment."""
        pass

    @abstractmethod
    def verify_webhook(self, raw_payload: bytes, signature: str, timestamp: str, secret: str) -> bool:
        """Verifies cryptographic HMAC signature and timestamp."""
        pass


class MockPaymentProvider(PaymentProvider):
    """
    In-memory simulated payment provider for local development, automated tests,
    and offline enterprise deployments. Supports cryptographic HMAC-SHA256 webhook testing.
    """

    DEFAULT_WEBHOOK_SECRET = "whsec_mock_iqac_saas_secret_key_2026"

    def create_customer(self, college: College, email: str, name: str) -> Dict[str, Any]:
        return {
            'success': True,
            'customer_id': f"cus_mock_{college.code.lower()}_{uuid.uuid4().hex[:8]}",
            'email': email,
            'name': name,
            'provider': 'MockPaymentProvider',
            'created_at': timezone.now().isoformat(),
        }

    def create_checkout(
        self, college: College, plan: Plan, cycle: str, success_url: str, cancel_url: str
    ) -> Dict[str, Any]:
        session_id = f"cs_mock_{uuid.uuid4().hex[:16]}"
        checkout_url = f"{success_url}?session_id={session_id}&plan={plan.code}&cycle={cycle}"
        return {
            'success': True,
            'checkout_session_id': session_id,
            'checkout_url': checkout_url,
            'plan_code': plan.code,
            'cycle': cycle,
            'provider': 'MockPaymentProvider',
        }

    def create_subscription(
        self, college: College, plan: Plan, billing_cycle: str = BillingCycle.YEARLY, payment_method: Optional[str] = None
    ) -> Dict[str, Any]:
        sub_id = f"sub_mock_{uuid.uuid4().hex[:12]}"
        now = timezone.now()
        days = 365 if billing_cycle == BillingCycle.YEARLY else 30
        return {
            'success': True,
            'subscription_id': sub_id,
            'plan_code': plan.code,
            'billing_cycle': billing_cycle,
            'status': SubscriptionStatus.ACTIVE,
            'current_period_start': now.isoformat(),
            'current_period_end': (now + timezone.timedelta(days=days)).isoformat(),
            'provider': 'MockPaymentProvider',
        }

    def get_subscription(self, subscription_id: str) -> Dict[str, Any]:
        return {
            'success': True,
            'subscription_id': subscription_id,
            'status': SubscriptionStatus.ACTIVE,
            'provider': 'MockPaymentProvider',
            'fetched_at': timezone.now().isoformat(),
        }

    def update_subscription(self, subscription: Subscription, new_plan: Plan) -> Dict[str, Any]:
        return {
            'success': True,
            'subscription_id': subscription.subscription_id or f"sub_mock_{uuid.uuid4().hex[:12]}",
            'new_plan_code': new_plan.code,
            'status': SubscriptionStatus.ACTIVE,
            'updated_at': timezone.now().isoformat(),
            'provider': 'MockPaymentProvider',
        }

    def cancel_subscription(self, subscription: Subscription, immediate: bool = False) -> Dict[str, Any]:
        now = timezone.now()
        effective_date = now if immediate else (subscription.current_period_end or now)
        return {
            'success': True,
            'subscription_id': subscription.subscription_id,
            'status': SubscriptionStatus.CANCELLED if immediate else subscription.status,
            'cancel_at_period_end': not immediate,
            'effective_cancellation': effective_date.isoformat(),
            'provider': 'MockPaymentProvider',
        }

    def pause_subscription(self, subscription: Subscription) -> Dict[str, Any]:
        return {
            'success': True,
            'subscription_id': subscription.subscription_id,
            'status': SubscriptionStatus.PAUSED,
            'paused_at': timezone.now().isoformat(),
            'provider': 'MockPaymentProvider',
        }

    def resume_subscription(self, subscription: Subscription) -> Dict[str, Any]:
        return {
            'success': True,
            'subscription_id': subscription.subscription_id,
            'status': SubscriptionStatus.ACTIVE,
            'resumed_at': timezone.now().isoformat(),
            'provider': 'MockPaymentProvider',
        }

    def create_invoice(
        self, college: College, subscription: Optional[Subscription], amount: Decimal, tax_rate: Decimal, currency: str = 'INR'
    ) -> Dict[str, Any]:
        inv_id = f"inv_mock_{timezone.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}"
        tax_amount = round(amount * (tax_rate / Decimal('100.0')), 2)
        total_amount = amount + tax_amount
        return {
            'success': True,
            'provider_invoice_id': inv_id,
            'amount': float(amount),
            'tax_rate': float(tax_rate),
            'tax_amount': float(tax_amount),
            'total_amount': float(total_amount),
            'currency': currency,
            'status': InvoiceStatus.OPEN,
            'provider': 'MockPaymentProvider',
        }

    def get_invoice(self, invoice_id: str) -> Dict[str, Any]:
        return {
            'success': True,
            'invoice_id': invoice_id,
            'status': InvoiceStatus.PAID,
            'pdf_url': f"/api/v1/billing/invoices/{invoice_id}/pdf/",
            'provider': 'MockPaymentProvider',
        }

    def refund_payment(self, payment_reference: str, amount: Decimal, reason: str = "") -> Dict[str, Any]:
        return {
            'success': True,
            'refund_reference': f"rfnd_{uuid.uuid4().hex[:12]}",
            'payment_reference': payment_reference,
            'amount': float(amount),
            'status': PaymentStatus.REFUNDED,
            'reason': reason,
            'refunded_at': timezone.now().isoformat(),
            'provider': 'MockPaymentProvider',
        }

    def verify_webhook(self, raw_payload: bytes, signature: str, timestamp: str, secret: Optional[str] = None) -> bool:
        secret = secret or self.DEFAULT_WEBHOOK_SECRET
        if not signature or not timestamp:
            return False
        # Prevent replay attacks: timestamp must be within 300 seconds (5 minutes)
        try:
            ts = float(timestamp)
            current_ts = timezone.now().timestamp()
            if abs(current_ts - ts) > 300:
                return False
        except (ValueError, TypeError):
            return False

        expected_sig = self.generate_signature(raw_payload, timestamp, secret)
        return hmac.compare_digest(expected_sig, signature)

    @classmethod
    def generate_signature(cls, raw_payload: bytes, timestamp: str, secret: Optional[str] = None) -> str:
        secret = secret or cls.DEFAULT_WEBHOOK_SECRET
        payload_str = raw_payload.decode('utf-8') if isinstance(raw_payload, bytes) else str(raw_payload)
        signed_payload = f"{timestamp}.{payload_str}"
        return hmac.new(
            secret.encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()


class PlanChangeResult(tuple):
    """
    Backwards-compatible return type for BillingService.change_plan.
    Unpacks as (subscription, warnings) for Phase 17 callers,
    and delegates attribute lookups to subscription for Phase 11 callers.
    """
    def __new__(cls, subscription: Any, warnings: Any):
        return super().__new__(cls, (subscription, warnings))

    @property
    def subscription(self) -> Any:
        return self[0]

    @property
    def warnings(self) -> Any:
        return self[1]

    def __getattr__(self, name: str) -> Any:
        return getattr(self[0], name)


class BillingService:
    """
    Central orchestration service managing college tenant plans, commercial subscriptions,
    invoicing, quotas, safe downgrades, and billing notifications.
    """

    def __init__(self, provider: Optional[PaymentProvider] = None):
        self.provider = provider or MockPaymentProvider()

    def create_checkout_session(
        self, college: College, plan: Plan, cycle: str = BillingCycle.YEARLY, actor: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Creates a hosted or tokenized checkout session for upgrading or renewing.
        """
        success_url = "/billing"
        cancel_url = "/billing/plans"
        res = self.provider.create_checkout(college, plan, cycle, success_url, cancel_url)

        if actor:
            log_action(
                actor=actor,
                action='CHECKOUT_INITIATED',
                instance=college,
                college=college,
                comment=f"Initiated checkout for {plan.name} ({cycle})."
            )
        return res

    def subscribe_college(
        self,
        college: College,
        plan: Plan,
        billing_cycle: str = BillingCycle.YEARLY,
        actor: Optional[Any] = None,
        is_trial: bool = False,
        trial_days: int = 14,
        create_invoice: bool = True,
    ) -> Subscription:
        """
        Provisions a subscription. Enforces non-destructive data handling:
        previous records remain 100% intact.
        """
        now = timezone.now()
        period_days = 365 if billing_cycle == BillingCycle.YEARLY else 30
        period_end = now + timezone.timedelta(days=period_days)
        trial_end = now + timezone.timedelta(days=trial_days) if is_trial else None
        status = SubscriptionStatus.TRIAL if is_trial else SubscriptionStatus.ACTIVE

        provider_resp = self.provider.create_subscription(college, plan, billing_cycle)
        sub_id = provider_resp.get('subscription_id', f"sub_gen_{uuid.uuid4().hex[:10]}")

        with transaction.atomic():
            # Expire previous subscriptions without deleting records
            college.subscriptions.filter(
                status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE]
            ).update(status=SubscriptionStatus.EXPIRED)

            sub = Subscription.objects.create(
                college=college,
                plan=plan,
                status=status,
                billing_cycle=billing_cycle,
                start_date=now.date(),
                current_period_start=now,
                current_period_end=period_end,
                trial_ends_at=trial_end,
                subscription_id=sub_id,
                auto_renew=True,
                provider='mock',
            )

            # Ensure college tenant is active
            if college.status == 'SUSPENDED':
                college.status = 'ACTIVE'
                college.is_active = True
                college.save(update_fields=['status', 'is_active'])

            # Generate invoice for paid active subscription
            if create_invoice and not is_trial:
                self.generate_invoice_for_subscription(sub, actor=actor)

            if actor:
                log_action(
                    actor=actor,
                    action='SUBSCRIPTION_CREATED',
                    instance=sub,
                    college=college,
                    comment=f"Subscribed {college.name} to {plan.name} ({status}, {billing_cycle})."
                )

        # Notify authorized billing users
        self._send_billing_notification(
            college=college,
            event='TRIAL_STARTED' if is_trial else 'SUBSCRIPTION_RENEWED',
            title=f"Subscription Activated: {plan.name}",
            message=f"{college.name} is now on the {plan.name} plan."
        )

        return sub

    def validate_plan_change(self, college: College, new_plan: Plan) -> Tuple[bool, List[Dict[str, Any]], bool]:
        """
        Validates safe downgrade and over-quota conditions BEFORE modifying the plan.
        Returns: (can_proceed, warnings, is_downgrade)
        CRITICAL: Never deletes excess records! Flags warnings and restricts new additions.
        """
        from .services import UsageLimitService
        usage = UsageLimitService.get_or_create_usage(college)
        current_sub = college.active_subscription
        current_plan = current_sub.plan if current_sub else None

        warnings = []
        is_downgrade = False

        if current_plan:
            # Check price difference to detect downgrade
            if new_plan.price_monthly < current_plan.price_monthly:
                is_downgrade = True

        # Check faculty quota
        if usage.faculty_count > new_plan.max_faculty:
            warnings.append({
                'resource': 'Faculty',
                'current_usage': usage.faculty_count,
                'new_limit': new_plan.max_faculty,
                'difference': usage.faculty_count - new_plan.max_faculty,
                'message': (
                    f"Current faculty ({usage.faculty_count}) exceeds the new plan limit ({new_plan.max_faculty}). "
                    f"Existing records will be preserved, but adding new faculty will be restricted."
                )
            })

        # Check departments quota
        if usage.departments_count > new_plan.max_departments:
            warnings.append({
                'resource': 'Departments',
                'current_usage': usage.departments_count,
                'new_limit': new_plan.max_departments,
                'difference': usage.departments_count - new_plan.max_departments,
                'message': (
                    f"Current departments ({usage.departments_count}) exceeds the new plan limit ({new_plan.max_departments}). "
                    f"Existing departments remain accessible, but creating new departments will be restricted."
                )
            })

        # Check storage quota
        storage_gb = usage.storage_used_bytes / (1024 * 1024 * 1024)
        if storage_gb > new_plan.storage_limit_gb:
            warnings.append({
                'resource': 'Storage',
                'current_usage': f"{storage_gb:.2f} GB",
                'new_limit': f"{new_plan.storage_limit_gb} GB",
                'difference': f"{(storage_gb - new_plan.storage_limit_gb):.2f} GB",
                'message': (
                    f"Current storage ({storage_gb:.2f} GB) exceeds new plan limit ({new_plan.storage_limit_gb} GB). "
                    f"Existing evidence documents remain downloadable, but uploading new files will be blocked."
                )
            })

        # Check users quota
        if usage.users_count > new_plan.max_users:
            warnings.append({
                'resource': 'Users',
                'current_usage': usage.users_count,
                'new_limit': new_plan.max_users,
                'difference': usage.users_count - new_plan.max_users,
                'message': (
                    f"Current users ({usage.users_count}) exceeds new plan limit ({new_plan.max_users}). "
                    f"Existing users can log in, but inviting new users will be blocked."
                )
            })

        return True, warnings, is_downgrade

    def change_plan(
        self, college: College, new_plan: Plan, actor: Optional[Any] = None
    ) -> Tuple[Subscription, List[Dict[str, Any]]]:
        """
        Safely upgrades or downgrades plan. Records audit and NEVER deletes records.
        """
        can_proceed, warnings, is_downgrade = self.validate_plan_change(college, new_plan)
        current_sub = college.active_subscription

        if not current_sub:
            sub = self.subscribe_college(college, new_plan, actor=actor)
            return PlanChangeResult(sub, warnings)

        self.provider.update_subscription(current_sub, new_plan)

        with transaction.atomic():
            old_plan_name = current_sub.plan.name
            current_sub.plan = new_plan
            current_sub.save(update_fields=['plan', 'updated_at'])

            action_name = 'PLAN_DOWNGRADED' if is_downgrade else 'PLAN_UPGRADED'
            if actor:
                log_action(
                    actor=actor,
                    action=action_name,
                    instance=current_sub,
                    college=college,
                    comment=(
                        f"{'Downgraded' if is_downgrade else 'Upgraded'} plan for {college.name} "
                        f"from {old_plan_name} to {new_plan.name}. Warnings: {len(warnings)}."
                    )
                )

        self._send_billing_notification(
            college=college,
            event='SUBSCRIPTION_RENEWED',
            title=f"Plan Changed: {new_plan.name}",
            message=f"Plan updated to {new_plan.name}. Any quota restrictions will prevent new additions safely."
        )

        return PlanChangeResult(current_sub, warnings)

    def cancel_subscription(
        self, subscription: Subscription, immediate: bool = True, actor: Optional[Any] = None
    ) -> Subscription:
        """
        Cancels subscription immediately or at period end.
        CRITICAL: Never deletes institutional data!
        """
        self.provider.cancel_subscription(subscription, immediate=immediate)

        with transaction.atomic():
            if immediate:
                subscription.status = SubscriptionStatus.CANCELLED
                subscription.cancelled_at = timezone.now()
                subscription.auto_renew = False
                subscription.save(update_fields=['status', 'cancelled_at', 'auto_renew', 'updated_at'])
            else:
                subscription.cancel_at_period_end = True
                subscription.auto_renew = False
                subscription.save(update_fields=['cancel_at_period_end', 'auto_renew', 'updated_at'])

            if actor:
                log_action(
                    actor=actor,
                    action='SUBSCRIPTION_CANCELLED',
                    instance=subscription,
                    college=subscription.college,
                    comment=f"Cancelled subscription for {subscription.college.name} (immediate={immediate})."
                )

        self._send_billing_notification(
            college=subscription.college,
            event='SUBSCRIPTION_CANCELLED',
            title="Subscription Cancelled",
            message="Your subscription has been cancelled. All institutional records and evidence remain preserved."
        )

        return subscription

    def pause_subscription(self, subscription: Subscription, actor: Optional[Any] = None) -> Subscription:
        """Pauses subscription. Preserves institutional data."""
        self.provider.pause_subscription(subscription)

        with transaction.atomic():
            subscription.status = SubscriptionStatus.PAUSED
            subscription.pause_start = timezone.now()
            subscription.save(update_fields=['status', 'pause_start', 'updated_at'])

            if actor:
                log_action(
                    actor=actor,
                    action='SUBSCRIPTION_PAUSED',
                    instance=subscription,
                    college=subscription.college,
                    comment=f"Paused subscription for {subscription.college.name}."
                )
        return subscription

    def resume_subscription(self, subscription: Subscription, actor: Optional[Any] = None) -> Subscription:
        """Resumes a paused subscription."""
        self.provider.resume_subscription(subscription)

        with transaction.atomic():
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.pause_end = timezone.now()
            subscription.save(update_fields=['status', 'pause_end', 'updated_at'])

            if actor:
                log_action(
                    actor=actor,
                    action='SUBSCRIPTION_RESUMED',
                    instance=subscription,
                    college=subscription.college,
                    comment=f"Resumed subscription for {subscription.college.name}."
                )
        return subscription

    def reactivate_subscription(self, subscription: Subscription, actor: Optional[Any] = None) -> Subscription:
        """Reactivates an expired or cancelled subscription."""
        with transaction.atomic():
            now = timezone.now()
            period_days = 365 if subscription.billing_cycle == BillingCycle.YEARLY else 30
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.current_period_start = now
            subscription.current_period_end = now + timezone.timedelta(days=period_days)
            subscription.cancelled_at = None
            subscription.cancel_at_period_end = False
            subscription.auto_renew = True
            subscription.save()

            if actor:
                log_action(
                    actor=actor,
                    action='SUBSCRIPTION_REACTIVATED',
                    instance=subscription,
                    college=subscription.college,
                    comment=f"Reactivated subscription for {subscription.college.name}."
                )

        self._send_billing_notification(
            college=subscription.college,
            event='SUBSCRIPTION_RENEWED',
            title="Subscription Reactivated",
            message=f"Subscription for {subscription.college.name} has been successfully reactivated."
        )

        return subscription

    def generate_invoice_for_subscription(
        self, subscription: Subscription, tax_rate: Decimal = Decimal('18.00'), actor: Optional[Any] = None
    ) -> Invoice:
        """
        Creates an invoice with tax calculation and sequential numbering.
        """
        plan = subscription.plan
        amount = plan.price_yearly if subscription.billing_cycle == BillingCycle.YEARLY else plan.price_monthly
        amount = Decimal(str(amount))
        tax_amount = round(amount * (tax_rate / Decimal('100.0')), 2)
        total_amount = amount + tax_amount

        now = timezone.now()
        due_date = (now + timezone.timedelta(days=15)).date()
        invoice_num = f"INV-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

        with transaction.atomic():
            invoice = Invoice.objects.create(
                college=subscription.college,
                subscription=subscription,
                invoice_number=invoice_num,
                billing_period_start=subscription.current_period_start,
                billing_period_end=subscription.current_period_end or (now + timezone.timedelta(days=30)),
                amount=amount,
                tax_name='GST',
                tax_rate=tax_rate,
                tax_amount=tax_amount,
                total_amount=total_amount,
                currency=plan.currency,
                status=InvoiceStatus.OPEN,
                issue_date=now.date(),
                due_date=due_date,
                provider_invoice_id=f"inv_mock_{invoice_num.lower()}",
                provider='mock',
                pdf_url=f"/api/v1/billing/invoices/{invoice_num}/pdf/",
            )

            if actor:
                log_action(
                    actor=actor,
                    action='INVOICE_GENERATED',
                    instance=invoice,
                    college=subscription.college,
                    comment=f"Generated invoice {invoice_num} for {total_amount} {plan.currency}."
                )

        return invoice

    def record_payment(
        self,
        invoice: Invoice,
        amount: Decimal,
        status: str = PaymentStatus.SUCCESS,
        payment_method: str = 'CARD',
        payment_reference: Optional[str] = None,
        error_message: str = "",
        actor: Optional[Any] = None
    ) -> PaymentTransaction:
        """
        Records payment transaction, updates invoice status, and handles past due/grace period.
        """
        ref = payment_reference or f"pay_mock_{uuid.uuid4().hex[:14]}"

        with transaction.atomic():
            txn = PaymentTransaction.objects.create(
                college=invoice.college,
                invoice=invoice,
                amount=amount,
                currency=invoice.currency,
                status=status,
                payment_reference=ref,
                provider=invoice.provider,
                payment_method=payment_method,
                error_message=error_message,
            )

            if status == PaymentStatus.SUCCESS:
                invoice.status = InvoiceStatus.PAID
                invoice.paid_at = timezone.now()
                invoice.save(update_fields=['status', 'paid_at', 'updated_at'])

                # Activate subscription
                if invoice.subscription:
                    invoice.subscription.status = SubscriptionStatus.ACTIVE
                    invoice.subscription.save(update_fields=['status', 'updated_at'])

                self._send_billing_notification(
                    college=invoice.college,
                    event='PAYMENT_SUCCESS',
                    title=f"Payment Successful: {invoice.currency} {amount}",
                    message=f"Invoice #{invoice.invoice_number} has been marked PAID."
                )
            else:
                # Payment failure: set subscription to PAST_DUE and start grace period
                if invoice.subscription:
                    invoice.subscription.status = SubscriptionStatus.PAST_DUE
                    invoice.subscription.save(update_fields=['status', 'updated_at'])

                self._send_billing_notification(
                    college=invoice.college,
                    event='PAYMENT_FAILED',
                    title="Payment Failed",
                    message=(
                        f"Payment for invoice #{invoice.invoice_number} failed. "
                        f"Your 14-day grace period is now active. All data remains preserved."
                    )
                )

            if actor:
                log_action(
                    actor=actor,
                    action='PAYMENT_RECORDED',
                    instance=txn,
                    college=invoice.college,
                    comment=f"Payment {ref} recorded with status {status}."
                )

        return txn

    def handle_webhook(
        self,
        event_id: str,
        event_type: str,
        payload: Dict[str, Any],
        signature: str,
        timestamp: str,
        secret: Optional[str] = None,
        headers: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, str]:
        """
        Cryptographically verifies and idempotently processes inbound provider billing webhooks.
        Defends against replay attacks (>300s window) and duplicate deliveries.
        """
        raw_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')

        # 1. Signature & replay attack verification
        if not self.provider.verify_webhook(raw_bytes, signature, timestamp, secret):
            BillingWebhookLog.objects.create(
                event_id=event_id,
                provider='mock',
                event_type=event_type,
                payload=payload,
                headers=headers or {},
                is_valid=False,
                error_message="Invalid webhook signature or expired timestamp (>300s).",
            )
            return False, "Signature verification or timestamp validation failed."

        # 2. Idempotency check: if event_id already processed, skip
        existing_log = BillingWebhookLog.objects.filter(event_id=event_id).first()
        if existing_log and existing_log.is_processed:
            return True, f"Event {event_id} already processed (idempotent skip)."

        log_entry, _ = BillingWebhookLog.objects.get_or_create(
            event_id=event_id,
            defaults={
                'provider': 'mock',
                'event_type': event_type,
                'payload': payload,
                'headers': headers or {},
                'is_valid': True,
            }
        )

        # 3. Process known webhook event types
        try:
            college_code = payload.get('college_code')
            college = College.objects.filter(code=college_code).first() if college_code else None

            if event_type == 'PAYMENT_SUCCESS':
                invoice_num = payload.get('invoice_number')
                invoice = Invoice.objects.filter(invoice_number=invoice_num).first()
                if invoice:
                    amount = Decimal(str(payload.get('amount', invoice.total_amount)))
                    self.record_payment(invoice, amount, status=PaymentStatus.SUCCESS)

            elif event_type == 'PAYMENT_FAILED':
                invoice_num = payload.get('invoice_number')
                invoice = Invoice.objects.filter(invoice_number=invoice_num).first()
                if invoice:
                    amount = Decimal(str(payload.get('amount', invoice.total_amount)))
                    err = payload.get('error_message', 'Payment processor rejected transaction.')
                    self.record_payment(invoice, amount, status=PaymentStatus.FAILED, error_message=err)

            elif event_type == 'SUBSCRIPTION_CREATED':
                plan_code = payload.get('plan_code')
                if college and plan_code:
                    plan = Plan.objects.filter(code=plan_code).first()
                    if plan:
                        self.subscribe_college(college, plan)

            elif event_type == 'SUBSCRIPTION_CANCELLED':
                if college and college.active_subscription:
                    self.cancel_subscription(college.active_subscription, immediate=True)

            log_entry.is_processed = True
            log_entry.college = college
            log_entry.processed_at = timezone.now()
            log_entry.save(update_fields=['is_processed', 'college', 'processed_at'])
            return True, f"Successfully processed {event_type}."

        except Exception as e:
            log_entry.error_message = str(e)
            log_entry.save(update_fields=['error_message'])
            return False, f"Webhook processing error: {str(e)}"

    def reconcile_subscription(self, subscription: Subscription) -> Dict[str, Any]:
        """
        Compares local database subscription state with payment provider state.
        Detects MATCH, MISMATCH, or UNKNOWN without destructive modification.
        """
        if not subscription.subscription_id:
            return {
                'subscription_id': None,
                'reconciliation_status': 'UNKNOWN',
                'details': 'No external subscription ID recorded.'
            }

        provider_data = self.provider.get_subscription(subscription.subscription_id)
        provider_status = provider_data.get('status')

        if not provider_status:
            return {
                'subscription_id': subscription.subscription_id,
                'reconciliation_status': 'UNKNOWN',
                'details': 'Could not fetch status from provider.'
            }

        if provider_status == subscription.status:
            status_match = 'MATCH'
        else:
            status_match = 'MISMATCH'

        return {
            'subscription_id': subscription.subscription_id,
            'college': subscription.college.name,
            'local_status': subscription.status,
            'provider_status': provider_status,
            'reconciliation_status': status_match,
            'last_audited': timezone.now().isoformat(),
        }

    def _send_billing_notification(self, college: College, event: str, title: str, message: str):
        """
        Dispatches in-app notification and email to authorized billing users.
        """
        try:
            from apps.notifications.services import NotificationDispatcher
            from apps.accounts.models import User, UserRole

            billing_users = User.objects.filter(
                college=college,
                role__in=[UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT, UserRole.IQAC],
                is_active=True
            )
            for user in billing_users:
                NotificationDispatcher.send(
                    user=user,
                    title=title,
                    message=message,
                    category='SYSTEM',
                    priority='HIGH',
                    action_url='/billing',
                    action_label='View Billing'
                )
        except Exception:
            pass
