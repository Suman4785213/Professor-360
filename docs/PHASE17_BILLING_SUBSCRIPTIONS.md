# Phase 17: Commercial SaaS Billing, Subscriptions & Entitlements

## 1. Executive Summary & Core Governance Invariant
Phase 17 transitions the institutional multi-tenant foundation into a production-ready commercial SaaS platform with payment provider abstraction, automated invoicing (18% GST), multi-tier entitlement resolution, safe plan downgrades, subscription reconciliation, and revenue analytics.

### Uncompromising Data Preservation Rule
> [!IMPORTANT]
> **Institutional compliance records cannot be destroyed or held hostage.**
> Under **NO circumstances** will faculty profiles, activity submissions, verified evidence documents, verification audit trails, AQAR/SSR compliance workspaces, generated reports, or platform audit logs be deleted or corrupted due to:
> - Free trial expiration
> - Subscription cancellation (immediate or end-of-period)
> - Failed recurring payment or past-due state
> - Plan downgrade where current usage exceeds lower tier quotas
> - Tenant temporary suspension
>
> When resource limits are reached or a subscription becomes past-due, the system switches to **graceful restriction of new additions** while preserving 100% read, export, and compliance viewing capabilities.

---

## 2. Architecture & Service Layer

```
                             [Institutional User Request]
                                          │
                                          ▼
                             [EntitlementService]
                                          │
      ┌───────────────────────────────────┼───────────────────────────────────┐
      │                                   │                                   │
      ▼                                   ▼                                   ▼
Tier 1: Tenant Status            Tier 2: Admin Override             Tier 3: Feature Flags
(SUSPENDED → Read Only)          (Valid From/Until Date Window)     (Tenant-specific toggles)
                                          │
                                          ▼
                                Tier 4: Plan Defaults
                          (STARTER / PRO / ENTERPRISE)
```

### 2.1 Billing & Payment Abstraction (`apps.colleges.billing.py`)
- **`PaymentProvider` Interface**: Abstract contract defining 12 standard methods (`create_customer`, `create_subscription`, `update_subscription`, `cancel_subscription`, `pause_subscription`, `resume_subscription`, `create_checkout_session`, `create_invoice`, `get_invoice`, `refund_payment`, `verify_webhook`, `generate_signature`).
- **`MockPaymentProvider`**: Production test provider with HMAC-SHA256 signature generation, replay attack defense ($|t_{current} - t_{event}| \le 300\text{s}$), and full lifecycle simulation.
- **`BillingService`**:
  - `create_checkout_session`: Provisions hosted checkout session URLs with plan and cycle metadata.
  - `subscribe_college`: Activates or transitions subscriptions, expiring previous subscriptions without deleting historical records.
  - `validate_plan_change`: Evaluates faculty, department, user, and storage usage against new plan limits. Warns and prevents corruption upon downgrade.
  - `change_plan`: Executes safe upgrade or downgrade with audit logging (`PLAN_UPGRADED` / `PLAN_DOWNGRADED`).
  - `cancel_subscription`: Immediate cancellation or flag-at-period-end (`cancel_at_period_end = True`).
  - `pause_subscription` / `resume_subscription` / `reactivate_subscription`: Operational pause with data sealing.
  - `handle_webhook`: Verifies HMAC-SHA256 signatures, checks 5-minute replay window, prevents duplicate processing via `BillingWebhookLog` idempotency, and transitions subscription states.
  - `reconcile_subscription`: Compares local DB subscription state with payment gateway status, identifying `MATCH`, `MISMATCH`, or `UNKNOWN`.

### 2.2 Entitlement & Quota Management (`apps.colleges.services.py`)
- **`EntitlementService`**: Resolves feature keys using strict hierarchical precedence:
  1. Suspension check (`is_suspended` blocks mutation).
  2. Active and valid `AdminFeatureOverride` (takes highest precedence).
  3. Tenant-level `TenantFeatureFlag`.
  4. Plan-level features JSON allocation.
  5. Fallback defaults.
- **14-Day Grace Period Policy**: Tenants in `PAST_DUE` state are granted a configurable 14-day grace window during which regular operations and data exports continue uninterrupted before high-consumption features are restricted.
- **`UsageLimitService`**:
  - Soft limit warning thresholds at **70%, 80%, 90%, and 100%**.
  - Non-destructive hard limit handling: blocks only new uploads or invitations; never deletes existing records.
- **`RevenueAnalyticsService`**:
  - Calculates MRR, ARR, active subscriber distribution, and payment success rates.
  - **No Fake Data Policy**: When billing transaction history is young, sets `has_sufficient_data: False` with informative explanatory messaging rather than inventing mock metrics.

---

## 3. Database Schema Extensions (`apps/colleges/models.py`)

1. **`Plan` Enhancements**:
   - `max_api_requests_monthly`: Quota for external REST integrations.
   - `currency`: Default `'INR'`.
   - `is_custom_enterprise`: Flag for bespoke university agreements.
2. **`Subscription` Enhancements**:
   - Status updated with `PAUSED`.
   - `provider`: Gateway provider identifier (`mock`, `stripe`, `razorpay`).
   - `grace_period_days`: Configurable grace window (default 14 days).
   - `pause_start`, `pause_end`: Operational pause timestamps.
   - `cancel_at_period_end`: Flag for cancellation at billing period boundary.
   - Properties: `is_trial`, `trial_days_remaining`, `is_in_grace_period`, `is_restricted`.
3. **`Invoice`**:
   - Sequential numbering (`INV-YYYYMM-XXXX`).
   - Base amount, GST tax rate (18.00%), tax amount, and total amount.
   - Status: `DRAFT`, `OPEN`, `PAID`, `VOID`, `UNCOLLECTIBLE`, `REFUNDED`.
4. **`PaymentTransaction`**:
   - Gateway payment references, amounts, status, method, and failure error messages.
5. **`AdminFeatureOverride`**:
   - Super Admin controlled temporary overrides with mandatory `reason`, `valid_from`, `valid_until` timestamps, and audit logging.
6. **`BillingWebhookLog`**:
   - Event tracking, payload storage, HMAC validation status, and idempotency processing flag.
7. **`BillingSupportTicket`**:
   - In-app billing queries linked directly to the platform task and resolution engine.

---

## 4. Role-Based Access Control (RBAC) & Security
Existing 6 roles remain strictly preserved:
1. **Super Admin**: Full commercial SaaS oversight, MRR/ARR analytics, subscription reconciliation tool, and controlled feature overrides.
2. **College Management**: Tenant billing portal, invoice history, payment receipts, plan upgrades/downgrades, and billing support ticket creation.
3. **IQAC**: Resource usage meters, remaining quota indicators, and billing support requests.
4. **HOD**: Resource usage meters for assigned department context; shielded from financial transactions and invoices.
5. **Department In-charge**: Department quota visibility; shielded from billing controls.
6. **Faculty**: Quota context on file uploads; shielded from financial controls.

---

## 5. Automated Verification Results
- **Phase 17 Unit Tests**: 16/16 passed on live PostgreSQL database (`test_01` through `test_16`).
- **Platform Regression Suite**: 100/100 tests passed across all platform phases (`apps.analytics.tests_phase9`, `apps.notifications.tests_phase10`, `apps.colleges.tests_phase11`, `apps.colleges.tests_phase12_security`, `apps.imports.tests_phase14`, `apps.ai.tests_phase15`, `apps.integrations.tests_phase16`, `apps.colleges.tests_phase17`).
- **Frontend Production Build**: `tsc -b && vite build` succeeded with 0 errors (built in 18.19s).
- **Frontend Linter**: 0 errors across 124 source files.
