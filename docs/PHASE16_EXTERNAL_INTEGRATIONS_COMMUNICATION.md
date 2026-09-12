# Phase 16: External Integrations & Communication Platform

## 1. Executive Summary & Core Architecture Principle

### Core Principle: Zero-Dependency Failure Resilience

In high-stakes college quality assurance and accreditation compliance, the core SaaS platform must never depend on the availability or latency of external systems.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CORE IQAC SAAS PLATFORM (CRITICAL)                  │
│                                                                        │
│  - Faculty Evidence Uploads       - 3-Tier Verification State Machine  │
│  - Criteria & Metrics Tracking    - AQAR & SSR Workspaces             │
│  - Task Management                - Audit Logs & Executive Analytics   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Non-blocking / Safe Hand-off
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASE 16 INTEGRATION & TELEMETRY LAYER               │
│                                                                        │
│  - Provider Abstraction Layer     - HMAC-SHA256 Request Signatures     │
│  - 3-Attempt Exponential Retries  - Safe Template Interpolation        │
│  - 5-Minute Replay Attack Window  - Tenant Barrier & Scoped REST API   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Decoupled External Calls
        ┌──────────────┬────────────┼─────────────┬──────────────┐
        ▼              ▼            ▼             ▼              ▼
┌──────────────┐ ┌───────────┐ ┌─────────┐ ┌─────────────┐ ┌────────────┐
│ External     │ │ External  │ │ Cloud   │ │ External    │ │ Identity   │
│ SMTP / SES   │ │ iCal/Cal  │ │ S3/GCS  │ │ Webhook ERP │ │ IdP (SSO)  │
│ (Email)      │ │ (Sync)    │ │ Storage │ │ (Endpoints) │ │ OIDC/SAML  │
└──────────────┘ └───────────┘ └─────────┘ └─────────────┘ └────────────┘
        │              │            │             │              │
        ▼              ▼            ▼             ▼              ▼
   [TIMEOUT /     [OFFLINE /   [NETWORK      [ENDPOINT      [PROVIDER   │
    SMTP 500]      INVALID]     DOWN]         UNREACHABLE]   OUTAGE]    │
        │              │            │             │              │
        └──────────────┴────────────┼─────────────┴──────────────┘
                                    │
                                    ▼
       ★ VERIFICATION, RECORDINGS, & WORKFLOWS PROCEED 100% ★
       ★ TELEMETRY IS LOGGED IN EmailDeliveryLog & WebhookLog ★
```

If any external service (Email SMTP, iCalendar sync, Cloud Storage, or Webhooks) experiences timeouts, network partitions, or outages:
- **Evidence Verification Approval proceeds without delay** and seals the record in the institutional dossier.
- **Activity creation, drafting, and SSR submissions never throw exceptions or block database transactions.**
- **The failure is safely trapped, recorded in delivery telemetry logs**, and queued for controlled retries with zero core impact.

---

## 2. Provider Abstraction Layer

The platform adopts a strict decoupled provider pattern located in `backend/apps/integrations/services/`:

| Provider Interface | Abstract Base Class | Default Engine | Production Alternative |
| :--- | :--- | :--- | :--- |
| **Email** | `BaseEmailProvider` | `SMTPEmailProvider` / `MockEmailProvider` | AWS SES, SendGrid |
| **Calendar** | `BaseCalendarProvider` | `ICalendarProvider` (RFC 5545) | Google Calendar API, MS Graph |
| **Storage** | `BaseStorageProvider` | `LocalStorageProvider` | `S3StorageProvider`, Azure Blob, GCS |
| **Webhooks** | `WebhookService` | HMAC-SHA256 Tokenized Dispatcher | Institutional Campus ERPs |
| **SSO** | `BaseSSOProvider` | `OIDCProvider` / `MockSSOProvider` | SAML 2.0, Google Workspace, Azure AD |

All provider operations return a normalized `IntegrationResult` dataclass containing:
```python
@dataclass
class IntegrationResult:
    success: bool
    status_code: int = 200
    message: str = ""
    data: Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None
    retryable: bool = False
```

---

## 3. Communication Center & Campus Broadcast Engine

A dedicated institutional communication hub at `/communication` empowers administrators to manage high-priority campus notifications:

### Institutional Announcements
- **Audience Targeting**: Announcements can be scoped to:
  1. `ENTIRE_COLLEGE`: Visible to all authenticated college users.
  2. `DEPARTMENT`: Scoped strictly to the target department's faculty and in-charges.
  3. `ROLE`: Targeted to specific roles (`FACULTY`, `DEPARTMENT_INCHARGE`, `HOD`, `IQAC`, `COLLEGE_MANAGEMENT`).
  4. `ACADEMIC_YEAR`: Targeted to users working on specific accreditation cycles.
- **Priority Escalation**: Four distinct visual alert levels (`LOW`, `NORMAL`, `HIGH`, `URGENT`).
- **Global `AnnouncementBanner`**: Active announcements are displayed in a non-intrusive, dismissible banner above the application layout.

### Outbound Email Delivery Monitoring
- Complete audit trail of every email triggered across the institution.
- Shows recipient, subject, event trigger, delivery status (`PENDING`, `SENT`, `FAILED`, `RETRYING`), attempt count, and provider response.
- **1-Click Manual Retry**: Operators can trigger an immediate re-attempt on failed or retrying notifications directly from the UI.

### Customizable Notification Templates
- Template management for standard lifecycle events (`EVIDENCE_VERIFIED`, `ACTIVITY_SUBMITTED`, `TASK_ASSIGNED`, `DEADLINE_REMINDER`).
- **Safe Variable Interpolation**: Replaces `{{faculty_name}}`, `{{activity_title}}`, `{{college_name}}`, `{{department_name}}`, and `{{comment}}` using string pattern substitution without arbitrary code execution.
- Real-time preview pane showing sample output with institutional branding.

---

## 4. Academic Calendar & Deadlines Sync (RFC 5545)

- **Standard**: Generates RFC 5545 compliant `.ics` feeds for calendar interoperability.
- **Supported Clients**: Google Calendar, Microsoft Outlook, Apple iCalendar.
- **Scoping**: Users can export:
  - `?scope=deadlines`: Institutional AQAR and SSR reporting cycle deadlines.
  - `?scope=tasks`: Assigned IQAC deliverables and departmental verification tasks.
  - `?scope=all`: Comprehensive unified academic schedule.
- **Data Minimization**: Calendar entries contain only event titles, dates, and secure portal links. No sensitive candidate data or confidential documents are exposed in calendar feeds.

---

## 5. Cloud Document Storage & Zero-Interruption Migration

### Secure Signed URLs
- Document downloads utilize tokenized HMAC signatures with configurable expiration timestamps (default: 15 minutes).
- Direct access to underlying object keys is denied; requests without valid signatures or past expiration are rejected.
- Each document record stores a cryptographic SHA-256 checksum to guarantee non-repudiation and evidence integrity.

### Storage Migration Utility
- Supports migrating document repositories between local storage, AWS S3, Azure Blob, and Google Cloud Storage.
- Asynchronous batch migration jobs track `total_files`, `migrated_files`, and `failed_files`.
- Validates SHA-256 hash before and after transfer before switching storage references.
- Existing documents remain fully accessible during migration with zero platform downtime.

---

## 6. External Webhooks Engine & Replay Attack Defense

### Cryptographic Signatures
Every outgoing webhook payload includes standard institutional security headers:
- `X-IQAC-Signature`: `sha256=<HMAC-SHA256(secret, payload)>`
- `X-IQAC-Event-ID`: Unique UUIDv4 event identifier.
- `X-IQAC-Timestamp`: ISO 8601 UTC timestamp.
- `X-IQAC-College`: College tenant identifier.

### 5-Minute Replay Window
Incoming and outgoing webhooks enforce a strict 300-second (5-minute) validity window:
$$\left| t_{\text{current}} - t_{\text{event}} \right| \le 300\text{ seconds}$$
Requests with timestamps outside this window or invalid signatures are rejected immediately.

### Data Minimization
Webhook payloads never include raw binary files or unverified student/faculty personal data. Only verified event metadata and institutional identifiers are dispatched.

---

## 7. Institutional REST API & Granular Scopes

External campus systems (ERP, HRMS, SIS) connect to `/api/integrations/v1/` using tokenized API keys.

### Scopes Supported
| Scope | Permission | Method & Path |
| :--- | :--- | :--- |
| `faculty:read` | Read faculty profiles | `GET /api/integrations/v1/faculty/` |
| `faculty:write` | Create / Update faculty profiles | `POST /api/integrations/v1/faculty/` |
| `activities:read` | Read faculty activities | `GET /api/integrations/v1/activities/` |
| `activities:write` | Submit draft activities | `POST /api/integrations/v1/activities/` |
| `evidence:read` | Read sealed evidence metadata | `GET /api/integrations/v1/evidence/` |
| `metric:read` | Read criteria and metric statuses | `GET /api/integrations/v1/metrics/` |
| `report:read` | Read generated reports | `GET /api/integrations/v1/reports/` |
| `task:read` | Read assigned IQAC deliverables | `GET /api/integrations/v1/tasks/` |
| `task:write` | Create deliverables from external system | `POST /api/integrations/v1/tasks/` |

### Critical Security Rule: External Writes Are Always DRAFT
Any activity submitted via the external API (`activities:write`) is automatically assigned:
- `status = 'DRAFT'`
- `source = 'API'`
- `is_verified = False`

External systems **can never mark an activity as verified or bypass faculty review**. The record enters the standard college workflow queue for human validation.

### Rate Limiting
- Enforced at **100 requests per minute** per API key.
- Returns HTTP 429 when threshold is reached with `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers.

---

## 8. Enterprise Single Sign-On (SSO) & Domain Discovery

- **Institutional Domain Discovery**: Users entering their institutional email (`user@college.edu`) are automatically routed to their college's configured identity provider without requiring tenant selection.
- **Protocols Supported**: OpenID Connect (OIDC), Google Workspace, Microsoft Azure Active Directory, SAML 2.0.
- **Enforcement Policy**: Institutions can toggle "Enforce SSO" to disable traditional password authentication for their domain, or retain password fallback for administrative continuity.

---

## 9. Verification & Automated Test Results

### Phase 16 Dedicated Test Suite (`apps.integrations.tests_phase16`)
| # | Test Name | Verification Target | Result |
| :--- | :--- | :--- | :--- |
| 1 | `test_01_external_email_failure_does_not_block_verification` | Zero-dependency resilience: Email SMTP timeout does not block IQAC approval | **PASS** |
| 2 | `test_02_email_template_interpolation_and_logging` | Template variable substitution without code injection; delivery logging | **PASS** |
| 3 | `test_03_email_retry_backoff_and_max_attempts` | Exponential retry capping after 3 attempts | **PASS** |
| 4 | `test_04_webhook_hmac_signature_and_replay_protection` | Valid HMAC-SHA256 signature and rejection of >300s replayed events | **PASS** |
| 5 | `test_05_webhook_data_minimization` | Payload metadata verification; absence of sensitive binaries | **PASS** |
| 6 | `test_06_rest_api_scope_enforcement` | Granular scope validation; 403 Forbidden on unpermitted scopes | **PASS** |
| 7 | `test_07_rest_api_rate_limiting_and_audit` | 100 req/min throttling headers and audit action logging | **PASS** |
| 8 | `test_08_tenant_isolation_cross_college_barrier` | Complete data barrier: College A API key cannot read College B data | **PASS** |
| 9 | `test_09_announcement_targeting_permissions` | Role and department audience scoping | **PASS** |
| 10 | `test_10_calendar_ical_rfc5545_export` | Standard `.ics` structure, VEVENT formatting, and valid UID | **PASS** |
| 11 | `test_11_storage_signed_urls_and_checksums` | Expiring signed URLs and SHA-256 integrity checksum verification | **PASS** |
| 12 | `test_12_sso_tenant_domain_discovery` | Domain resolution to college tenant configuration | **PASS** |

**Summary**: 12 / 12 tests passed (100%).

### Full Platform Regression Test Suite (Phases 9–16)
```bash
python manage.py test \
  apps.analytics.tests_phase9 \
  apps.notifications.tests_phase10 \
  apps.colleges.tests_phase11 \
  apps.colleges.tests_phase12_security \
  apps.imports.tests_phase14 \
  apps.ai.tests_phase15 \
  apps.integrations.tests_phase16 \
  --noinput
```
- **Total Tests Executed**: 84 tests
- **Passed**: 84
- **Failures / Errors**: 0
- **Regressions**: 0

### Frontend Quality Verification
- `tsc -b && vite build`: Completed in 33.00s with **0 errors**.
- `npm run lint`: Completed with **0 errors**.

---

## 10. Role Preservation & Access Control Verification

The 6 existing roles remain strictly preserved:
1. **Super Admin**: Full oversight of platform integrations, global health, and tenant SSO.
2. **College Management**: Access to Connected Services, institutional announcements, and integration health.
3. **IQAC Coordinator**: Full control over institutional API keys, webhooks, templates, broadcast announcements, and calendar exports.
4. **HOD**: Department-level announcements, calendar sync for department deadlines.
5. **Department In-charge**: Work queue calendar sync, departmental notices.
6. **Faculty**: Announcement banner notifications, personal schedule `.ics` export.

*No Auditor or Viewer roles were introduced.*
