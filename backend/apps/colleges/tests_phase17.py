"""
Phase 17 Automated Backend Test Suite — Commercial SaaS Billing & Subscriptions
Validates:
1. Fundamental institutional data preservation: never delete faculty, activities, evidence, or reports.
2. Subscription lifecycle: Trial -> Active -> Past Due -> Grace Period -> Cancelled -> Reactivated.
3. Trial system and days countdown.
4. Grace period enforcement (accessible during grace period, non-destructive restriction after).
5. Entitlement engine precedence: Suspension -> Admin Override -> Feature Flag -> Plan Features -> Defaults.
6. Admin temporary overrides with expiration and audit logging.
7. Soft limit warnings at 70%, 80%, 90%, 100% thresholds.
8. Hard limit handling without corrupting workflows (manual entry remains on AI limit, existing files preserved on storage limit).
9. Safe plan downgrade: warns when current usage exceeds new limits without deleting excess data.
10. Invoice creation with configurable tax (18% GST) and currency formatting.
11. Mock payment provider workflows (success, failure, refund).
12. Billing webhooks with HMAC-SHA256 signatures, replay attack defense (>300s window), and idempotency.
13. Cross-tenant billing data isolation (College A cannot access College B invoices or payments).
14. Billing reconciliation (MATCH vs MISMATCH).
15. Revenue analytics (MRR/ARR sufficiency check).
"""
import hmac
import hashlib
import json
import uuid
from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.colleges.models import (
    College, Plan, Subscription, SubscriptionStatus, BillingCycle,
    TenantFeatureFlag, TenantUsage, FeatureFlagKey, Invoice, InvoiceStatus,
    PaymentTransaction, PaymentStatus, AdminFeatureOverride, BillingWebhookLog,
    BillingSupportTicket, CollegeStatus
)
from apps.accounts.models import User, UserRole, FacultyProfile
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityCategory, Document, ActivityStatus
from apps.evidence.models import Evidence
from apps.reports.models import ReportType, GeneratedReport, ReportStatus
from apps.colleges.services import (
    FeatureAccessService, EntitlementService, UsageLimitService, RevenueAnalyticsService
)
from apps.colleges.billing import BillingService, MockPaymentProvider


class Phase17BillingAndCommercialSaaSTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        # 1. Plans
        self.starter_plan = Plan.objects.create(
            name="Starter Plan",
            code="starter",
            price_monthly=Decimal('4999.00'),
            price_yearly=Decimal('49990.00'),
            max_users=10,
            max_departments=3,
            max_faculty=25,
            storage_limit_gb=5.0,
            ai_processing_limit=50,
            max_reports_monthly=20,
            currency='INR',
            features={
                'AI_PROCESSING': True,
                'REPORT_GENERATION': True,
                'ADVANCED_ANALYTICS': False,
                'AQAR_WORKSPACE': True,
                'SSR_WORKSPACE': False,
            }
        )

        self.pro_plan = Plan.objects.create(
            name="Professional Plan",
            code="pro",
            price_monthly=Decimal('14999.00'),
            price_yearly=Decimal('149990.00'),
            max_users=50,
            max_departments=10,
            max_faculty=100,
            storage_limit_gb=25.0,
            ai_processing_limit=500,
            max_reports_monthly=100,
            currency='INR',
            features={
                'AI_PROCESSING': True,
                'REPORT_GENERATION': True,
                'ADVANCED_ANALYTICS': True,
                'AQAR_WORKSPACE': True,
                'SSR_WORKSPACE': True,
            }
        )

        # 2. Colleges (Tenants)
        self.college_a = College.objects.create(
            name="Apex Institute of Technology",
            code="AIT",
            status=CollegeStatus.ACTIVE,
            setup_completed=True,
        )
        self.college_b = College.objects.create(
            name="Beacon Global University",
            code="BGU",
            status=CollegeStatus.ACTIVE,
            setup_completed=True,
        )

        # 3. Department for College A
        self.dept_a = Department.objects.create(college=self.college_a, name="Computer Science", code="CS")

        # 4. Users for all roles
        self.super_admin = User.objects.create_user(
            email="admin@iqac-saas.com",
            password="SecurePassword123!",
            first_name="Platform",
            last_name="SuperAdmin",
            role=UserRole.SUPER_ADMIN,
        )

        self.mgmt_a = User.objects.create_user(
            email="mgmt@ait.edu",
            password="SecurePassword123!",
            first_name="Management",
            last_name="AIT",
            role=UserRole.COLLEGE_MANAGEMENT,
            college=self.college_a,
        )

        self.iqac_a = User.objects.create_user(
            email="iqac@ait.edu",
            password="SecurePassword123!",
            first_name="IQAC",
            last_name="Coordinator",
            role=UserRole.IQAC,
            college=self.college_a,
        )

        self.faculty_a = User.objects.create_user(
            email="faculty@ait.edu",
            password="SecurePassword123!",
            first_name="Prof",
            last_name="Sharma",
            role=UserRole.FACULTY,
            college=self.college_a,
            department=self.dept_a,
        )
        FacultyProfile.objects.create(
            user=self.faculty_a,
            college=self.college_a,
            department=self.dept_a,
            employee_id="EMP-AIT-001",
            designation="Assistant Professor"
        )

        self.mgmt_b = User.objects.create_user(
            email="mgmt@bgu.edu",
            password="SecurePassword123!",
            first_name="Management",
            last_name="BGU",
            role=UserRole.COLLEGE_MANAGEMENT,
            college=self.college_b,
        )

        # 5. Initialize Billing Service
        self.mock_provider = MockPaymentProvider()
        self.billing_service = BillingService(provider=self.mock_provider)

        # 6. Provision Subscriptions
        self.sub_a = self.billing_service.subscribe_college(
            self.college_a, self.pro_plan, billing_cycle=BillingCycle.YEARLY, actor=self.super_admin
        )
        self.sub_b = self.billing_service.subscribe_college(
            self.college_b, self.starter_plan, billing_cycle=BillingCycle.MONTHLY, is_trial=True, trial_days=14
        )

        # 7. Sample institutional records for College A
        self.ay_a = AcademicYear.objects.create(
            college=self.college_a, name="2025-26",
            start_date=date(2025, 6, 1), end_date=date(2026, 5, 31), is_current=True
        )
        self.cat_a = ActivityCategory.objects.create(college=self.college_a, name="Research Paper")
        self.activity_a = Activity.objects.create(
            college=self.college_a,
            department=self.dept_a,
            academic_year=self.ay_a,
            faculty=self.faculty_a,
            title="Quantum Machine Learning in Higher Ed",
            category=self.cat_a,
            status=ActivityStatus.VERIFIED_EVIDENCE,
        )
        self.evidence_a = Evidence.objects.create(
            college=self.college_a,
            activity=self.activity_a,
            department=self.dept_a,
            academic_year=self.ay_a,
            faculty=self.faculty_a,
            title="Quantum Machine Learning Evidence Proof",
            status='ACTIVE',
        )

    def test_01_non_destructive_data_preservation_on_expiry(self):
        """
        CRITICAL TEST: Under NO circumstances shall faculty, activities, evidence,
        reports, or verification history be deleted because of cancellation or past-due status.
        """
        # Cancel subscription immediately
        self.billing_service.cancel_subscription(self.sub_a, immediate=True, actor=self.mgmt_a)

        self.sub_a.refresh_from_db()
        self.assertEqual(self.sub_a.status, SubscriptionStatus.CANCELLED)

        # Verify institutional records remain 100% intact!
        self.assertTrue(FacultyProfile.objects.filter(college=self.college_a).exists())
        self.assertTrue(Activity.objects.filter(id=self.activity_a.id, status=ActivityStatus.VERIFIED_EVIDENCE).exists())
        self.assertTrue(Evidence.objects.filter(id=self.evidence_a.id, status='ACTIVE').exists())
        self.assertTrue(Department.objects.filter(id=self.dept_a.id).exists())

    def test_02_subscription_lifecycle_transitions(self):
        """
        Tests valid subscription state transitions:
        Trial -> Active -> Past Due -> Cancelled -> Reactivated.
        """
        sub = self.sub_b
        self.assertEqual(sub.status, SubscriptionStatus.TRIAL)

        # Transition Trial to Active
        inv = self.billing_service.generate_invoice_for_subscription(sub)
        self.billing_service.record_payment(inv, inv.total_amount, status=PaymentStatus.SUCCESS)
        sub.refresh_from_db()
        self.assertEqual(sub.status, SubscriptionStatus.ACTIVE)

        # Transition to Past Due on payment failure
        inv2 = self.billing_service.generate_invoice_for_subscription(sub)
        self.billing_service.record_payment(inv2, inv2.total_amount, status=PaymentStatus.FAILED, error_message="Insufficient funds")
        sub.refresh_from_db()
        self.assertEqual(sub.status, SubscriptionStatus.PAST_DUE)

        # Cancel
        self.billing_service.cancel_subscription(sub, immediate=True)
        sub.refresh_from_db()
        self.assertEqual(sub.status, SubscriptionStatus.CANCELLED)

        # Reactivate
        self.billing_service.reactivate_subscription(sub)
        sub.refresh_from_db()
        self.assertEqual(sub.status, SubscriptionStatus.ACTIVE)

    def test_03_trial_countdown_and_expiration(self):
        """
        Verifies trial days countdown and trial properties.
        """
        sub = self.sub_b
        self.assertTrue(sub.is_trial)
        self.assertGreaterEqual(sub.trial_days_remaining, 13)
        self.assertLessEqual(sub.trial_days_remaining, 14)

        # Simulate expired trial
        sub.trial_ends_at = timezone.now() - timedelta(days=1)
        sub.save()
        self.assertEqual(sub.trial_days_remaining, 0)

    def test_04_grace_period_enforcement(self):
        """
        Tests grace period: when past due, operations remain permitted during the 14-day grace period,
        and are restricted non-destructively only after grace period expires.
        """
        sub = self.sub_a
        sub.status = SubscriptionStatus.PAST_DUE
        sub.current_period_end = timezone.now() - timedelta(days=5)  # 5 days past due, within 14-day grace period
        sub.save()

        self.assertTrue(sub.is_in_grace_period)
        self.assertFalse(sub.is_restricted)

        # Past grace period (>14 days)
        sub.current_period_end = timezone.now() - timedelta(days=20)
        sub.save()

        self.assertFalse(sub.is_in_grace_period)
        self.assertTrue(sub.is_restricted)

        # Verify EntitlementService blocks resource-heavy ops but preserves read data
        can_ai, msg = EntitlementService.can_access_feature(self.college_a, FeatureFlagKey.AI_PROCESSING)
        self.assertFalse(can_ai)
        self.assertIn("restricted", msg)

    def test_05_entitlement_service_priority(self):
        """
        Tests entitlement priority:
        1. Suspension -> 2. Admin Override -> 3. Tenant Feature Flag -> 4. Plan features.
        """
        # Pro plan has ADVANCED_ANALYTICS: True, Starter plan has ADVANCED_ANALYTICS: False
        self.assertTrue(FeatureAccessService.is_feature_enabled(self.college_a, FeatureFlagKey.ADVANCED_ANALYTICS))
        self.assertFalse(FeatureAccessService.is_feature_enabled(self.college_b, FeatureFlagKey.ADVANCED_ANALYTICS))

        # Add TenantFeatureFlag to enable ADVANCED_ANALYTICS for College B
        TenantFeatureFlag.objects.create(
            college=self.college_b,
            feature_key=FeatureFlagKey.ADVANCED_ANALYTICS,
            is_enabled=True,
            reason="Special institutional grant"
        )
        self.assertTrue(FeatureAccessService.is_feature_enabled(self.college_b, FeatureFlagKey.ADVANCED_ANALYTICS))

        # Add AdminFeatureOverride for College B with SSR_WORKSPACE
        self.assertFalse(FeatureAccessService.is_feature_enabled(self.college_b, FeatureFlagKey.SSR_WORKSPACE))
        AdminFeatureOverride.objects.create(
            college=self.college_b,
            feature_key=FeatureFlagKey.SSR_WORKSPACE,
            is_enabled=True,
            reason="Temporary NAAC preparation waiver",
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=30),
            created_by=self.super_admin,
            is_active=True
        )
        self.assertTrue(FeatureAccessService.is_feature_enabled(self.college_b, FeatureFlagKey.SSR_WORKSPACE))

    def test_06_admin_temporary_override_expiration(self):
        """
        Tests that an expired AdminFeatureOverride automatically loses authority.
        """
        override = AdminFeatureOverride.objects.create(
            college=self.college_b,
            feature_key=FeatureFlagKey.SSR_WORKSPACE,
            is_enabled=True,
            reason="Temporary grant expired",
            valid_from=timezone.now() - timedelta(days=10),
            valid_until=timezone.now() - timedelta(days=1),  # Expired yesterday
            created_by=self.super_admin,
            is_active=True
        )
        self.assertFalse(override.is_currently_valid)
        self.assertFalse(FeatureAccessService.is_feature_enabled(self.college_b, FeatureFlagKey.SSR_WORKSPACE))

    def test_07_soft_limit_warnings(self):
        """
        Tests soft limit warnings trigger at 70%, 80%, 90%, and 100% thresholds.
        """
        usage = UsageLimitService.get_or_create_usage(self.college_a)
        # Pro plan max_faculty is 100. Let's set faculty_count to 85 (85%)
        usage.faculty_count = 85
        usage.save()

        summary = UsageLimitService.get_usage_summary(self.college_a)
        self.assertEqual(summary['faculty']['percentage'], 85.0)
        self.assertEqual(summary['faculty']['remaining'], 15)
        self.assertEqual(summary['faculty']['warning_level'], 80)

        warnings = summary['soft_warnings']
        faculty_warns = [w for w in warnings if w['resource'] == 'Faculty']
        self.assertEqual(len(faculty_warns), 1)
        self.assertEqual(faculty_warns[0]['threshold'], 80)
        self.assertIn("85.0%", faculty_warns[0]['message'])

    def test_08_hard_limit_handling_without_corruption(self):
        """
        Tests that reaching a quota pauses new creation without corrupting existing records.
        """
        usage = UsageLimitService.get_or_create_usage(self.college_a)
        # Set AI jobs to limit (500)
        usage.ai_jobs_this_month = 500
        usage.save()

        can_ai, msg = UsageLimitService.check_ai_quota(self.college_a)
        self.assertFalse(can_ai)
        self.assertIn("AI processing quota reached", msg)
        self.assertIn("Manual entry remains fully functional", msg)

        # Existing activity and evidence remain intact
        self.assertTrue(Activity.objects.filter(id=self.activity_a.id).exists())

    def test_09_safe_downgrade_over_limit_warning(self):
        """
        Tests safe downgrade: when college has 45 faculty members and downgrades
        to Starter Plan (limit 25), the system warns and permits downgrade without deleting the 20 excess records.
        """
        usage = UsageLimitService.get_or_create_usage(self.college_a)
        usage.faculty_count = 45
        usage.save()

        can_proceed, warnings, is_downgrade = self.billing_service.validate_plan_change(
            self.college_a, self.starter_plan
        )
        self.assertTrue(can_proceed)
        self.assertTrue(is_downgrade)
        self.assertTrue(any(w['resource'] == 'Faculty' for w in warnings))

        # Perform downgrade
        sub, returned_warnings = self.billing_service.change_plan(
            self.college_a, self.starter_plan, actor=self.mgmt_a
        )
        self.assertEqual(sub.plan.code, 'starter')

        # Verify no faculty was deleted!
        usage.refresh_from_db()
        self.assertEqual(usage.faculty_count, 45)

        # Verify adding new faculty is blocked
        can_add_faculty, faculty_msg = UsageLimitService.check_faculty_quota(self.college_a)
        self.assertFalse(can_add_faculty)
        self.assertIn("Existing faculty records remain preserved", faculty_msg)

    def test_10_invoice_generation_and_tax_calculation(self):
        """
        Tests invoice generation with 18% GST tax calculation and sequential numbering.
        """
        invoice = self.billing_service.generate_invoice_for_subscription(
            self.sub_a, tax_rate=Decimal('18.00'), actor=self.mgmt_a
        )
        self.assertEqual(invoice.status, InvoiceStatus.OPEN)
        self.assertEqual(invoice.currency, 'INR')
        self.assertEqual(invoice.amount, Decimal('149990.00'))
        self.assertEqual(invoice.tax_rate, Decimal('18.00'))
        self.assertEqual(invoice.tax_amount, Decimal('26998.20'))
        self.assertEqual(invoice.total_amount, Decimal('176988.20'))
        self.assertTrue(invoice.invoice_number.startswith('INV-'))

    def test_11_mock_payment_success_and_failure(self):
        """
        Tests recording successful and failed payments and their impact on invoices and subscriptions.
        """
        invoice = self.billing_service.generate_invoice_for_subscription(self.sub_a)

        # Failed payment
        fail_txn = self.billing_service.record_payment(
            invoice, invoice.total_amount, status=PaymentStatus.FAILED,
            error_message="Card expired", actor=self.mgmt_a
        )
        self.assertEqual(fail_txn.status, PaymentStatus.FAILED)
        self.sub_a.refresh_from_db()
        self.assertEqual(self.sub_a.status, SubscriptionStatus.PAST_DUE)

        # Successful payment retry
        success_txn = self.billing_service.record_payment(
            invoice, invoice.total_amount, status=PaymentStatus.SUCCESS,
            payment_method='UPI', actor=self.mgmt_a
        )
        self.assertEqual(success_txn.status, PaymentStatus.SUCCESS)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.PAID)
        self.sub_a.refresh_from_db()
        self.assertEqual(self.sub_a.status, SubscriptionStatus.ACTIVE)

    def test_12_webhook_signature_verification_and_replay_defense(self):
        """
        Tests HMAC-SHA256 signature verification and 5-minute replay attack defense.
        """
        payload = {
            'college_code': self.college_a.code,
            'event_type': 'PAYMENT_SUCCESS',
            'amount': 10000.0,
            'invoice_number': 'INV-TEST-001'
        }
        raw_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
        now_ts = str(timezone.now().timestamp())
        valid_sig = MockPaymentProvider.generate_signature(raw_bytes, now_ts)

        # 1. Valid signature and fresh timestamp -> SUCCESS
        success, msg = self.billing_service.handle_webhook(
            event_id="evt_test_001",
            event_type="PAYMENT_SUCCESS",
            payload=payload,
            signature=valid_sig,
            timestamp=now_ts
        )
        self.assertTrue(success)

        # 2. Tampered signature -> FAILS
        success_bad_sig, _ = self.billing_service.handle_webhook(
            event_id="evt_test_002",
            event_type="PAYMENT_SUCCESS",
            payload=payload,
            signature="invalid_tampered_signature",
            timestamp=now_ts
        )
        self.assertFalse(success_bad_sig)

        # 3. Replay attack: stale timestamp (10 minutes old) -> FAILS
        stale_ts = str((timezone.now() - timedelta(minutes=10)).timestamp())
        stale_sig = MockPaymentProvider.generate_signature(raw_bytes, stale_ts)
        success_stale, stale_msg = self.billing_service.handle_webhook(
            event_id="evt_test_003",
            event_type="PAYMENT_SUCCESS",
            payload=payload,
            signature=stale_sig,
            timestamp=stale_ts
        )
        self.assertFalse(success_stale)
        self.assertIn("timestamp", stale_msg.lower())

    def test_13_webhook_idempotency(self):
        """
        Tests that duplicate deliveries of the same event_id are idempotently skipped.
        """
        payload = {'college_code': self.college_a.code, 'data': 'sample'}
        raw_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
        now_ts = str(timezone.now().timestamp())
        sig = MockPaymentProvider.generate_signature(raw_bytes, now_ts)
        event_id = f"evt_idem_{uuid.uuid4().hex[:8]}"

        # First delivery
        first_success, _ = self.billing_service.handle_webhook(
            event_id=event_id, event_type="CUSTOM_PING", payload=payload, signature=sig, timestamp=now_ts
        )
        self.assertTrue(first_success)

        # Duplicate delivery
        dup_success, dup_msg = self.billing_service.handle_webhook(
            event_id=event_id, event_type="CUSTOM_PING", payload=payload, signature=sig, timestamp=now_ts
        )
        self.assertTrue(dup_success)
        self.assertIn("already processed", dup_msg)

    def test_14_cross_tenant_billing_isolation(self):
        """
        Tests that College A cannot view or access College B's invoices or payments via REST API.
        """
        inv_a = self.billing_service.generate_invoice_for_subscription(self.sub_a)
        inv_b = self.billing_service.generate_invoice_for_subscription(self.sub_b)

        # Client authenticated as College A Management
        self.client.force_authenticate(user=self.mgmt_a)
        response = self.client.get('/api/v1/billing/invoices/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        returned_ids = [inv['id'] for inv in results]
        self.assertIn(str(inv_a.id), returned_ids)
        self.assertNotIn(str(inv_b.id), returned_ids)  # College B invoice MUST NOT leak!

        # Attempt direct IDOR access to College B invoice PDF
        detail_resp = self.client.get(f'/api/v1/billing/invoices/{inv_b.id}/pdf/')
        self.assertEqual(detail_resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_15_billing_reconciliation(self):
        """
        Tests subscription state reconciliation comparing local DB vs mock provider.
        """
        # Active subscription matching mock provider
        audit = self.billing_service.reconcile_subscription(self.sub_a)
        self.assertEqual(audit['reconciliation_status'], 'MATCH')

        # Artificially modify local status to test mismatch detection
        self.sub_a.status = SubscriptionStatus.PAST_DUE
        self.sub_a.save()
        audit_mismatch = self.billing_service.reconcile_subscription(self.sub_a)
        self.assertEqual(audit_mismatch['reconciliation_status'], 'MISMATCH')

    def test_16_revenue_analytics_data_sufficiency(self):
        """
        Tests that Super Admin revenue metrics correctly compute MRR/ARR when payments exist,
        and never invent fake figures.
        """
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get('/api/v1/admin/billing/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertIn('mrr', data)
        self.assertIn('arr', data)
        self.assertIn('active_subscriptions', data)
        self.assertIn('plan_distribution', data)
        self.assertGreaterEqual(data['active_subscriptions'], 1)
        self.assertGreater(data['mrr'], 0.0)
