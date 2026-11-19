# Phase 2 / Phase 2.1 implementation report

Date: 2026-11-14. **Final status: PASS for backend/mobile API readiness deliverables.** This supersedes the earlier PARTIAL report. No mobile application or Phase 3 work was started; review this phase before authorizing mobile implementation. PASS is not production deployment approval.

## Completed deliverables

### 1. Concurrency and retry verification

Retained Phase 2 Activity-first row locking and transaction boundaries. Added real PostgreSQL TransactionTestCase races using separate thread connections and a synchronization barrier. Every worker asserts the exact disposable test database name; the suite rejects a database not prefixed test_p360_security_. Connections close in finally blocks.

Tests verify concurrent faculty submission, in-charge approval, returned-to-in-charge recovery, HOD approval, IQAC approval and conflicting approve/reject requests. One request commits and the competing invalid transition returns 400. Activity and verification states agree, one log is recorded, final evidence is created once, and recipients do not receive duplicate workflow notifications. The invalid-stage matrix exercises each stage against all other ActivityStatus values. Existing tests retain faculty resubmission and cross-college permission coverage.

### 2. Report generation, merging and handoffs

Added optional persistent Idempotency-Key handling for generate, incharge-faculty-report and merge-reports. Actor row locks serialize first-use requests; hashed keys bind actor/role/college/department/action and body. Successful response/status is stored in existing report metadata. Identical retries replay; conflicting bodies or unavailable originals return 409. No-key requests preserve intentional legacy regeneration. Tests cover concurrent generation, sequential generation replay/body conflict and PDF merge replay/conflict. Cached responses use DRF JSON encoding to retain timestamp precision.

Handoffs and HOD acknowledgement lock the scoped report and preserve original metadata/timestamps. Repeats replay the first result without audit or notification duplication. Previously submitted historical reports are recognized without rewriting files. Completed status and assigned department/role are required. Removed fallback delivery to an unrelated department HOD; absence of an assigned active HOD now returns 400. Non-PDF merge input is rejected explicitly. Concurrent handoffs and later repeats produce one HOD notification and one notification per Management/IQAC recipient. Department denial tests and prior report isolation tests pass.

### 3. Mobile API contracts

Replaced the draft architecture document with authentication, role matrix, verification state machine, report workflow, pagination/error conventions, multipart/private-file handling, notifications/tasks and analytics contracts. Added PHASE2_MOBILE_API_REFERENCE.md as a linked part of the contract: 137 registered method/path combinations plus serializer field types, required/read-only/null flags, choices, custom response construction, dynamic authorization guards and analytics service structures. SimpleJWT refresh is documented explicitly in the architecture document.

The repeatable export script imports route/serializer definitions with an intentionally unavailable inspection database/port and does not query institutional records. Source inspection, rather than incomplete OpenAPI annotation guesses, supplies the contract. Existing /api/ aliases and legacy response differences are documented. Aggregate analytics access and legacy IQAC return-target semantics are described as actually implemented.

### 4. Notifications and tasks

Recipient/tenant isolation reviewed. Removed unsafe generic notification CRUD; explicit read/preferences/report-response actions remain. Unread count and mark-all-read use the recipient/college queryset. Task related objects now receive tenant validation; faculty cannot assign peers and department staff cannot assign outside their department. Fixed department-less task visibility. Management cannot delete tasks through the inherited destroy action. Task status changes use a row lock, no-op identical retries and require reopening terminal states. Serializer status edits cannot bypass actions.

Report-request replies now lock their notification, validate request type/institution, and suppress repeated identical choices while preserving intentional changes such as Okay to Done. Concurrent task completion and identical report replies each produce a single side effect. Tests cover preferences, recipient read/count, foreign notification denial, task creation/assignment, comments, status actions and management read-only behavior. Existing notification dispatcher preference/cooldown tests also pass.

Website consumers were inspected: NotificationCenter uses explicit read actions, preferences uses the preferences action, TaskDetailModal uses status action endpoints, and CreateTaskModal submits TODO. These contracts remain compatible. No website design, branding, navigation or frontend source was modified in Phase 2.1.

## Files changed in Phase 2.1

- backend/apps/reports/retries.py (new)
- backend/apps/reports/views.py
- backend/apps/reports/tests_retries.py (new)
- backend/apps/verification/tests_concurrency.py (new)
- backend/apps/notifications/views.py
- backend/apps/notifications/serializers.py
- backend/apps/notifications/services.py
- backend/apps/notifications/tests_mobile.py (new)
- backend/export_mobile_contract.py (new)
- docs/PHASE2_MOBILE_API_ARCHITECTURE.md
- docs/PHASE2_MOBILE_API_REFERENCE.md (new)
- docs/PHASE2_IMPLEMENTATION_REPORT.md

Pre-existing Phase 1/1.1 and Phase 2 changes and unrelated workspace edits were preserved. This list is not the complete dirty Git status.

## Executed verification

| Command | Final result |
| --- | --- |
| python -B backend/run_security_tests.py apps.verification.tests_concurrency apps.reports.tests_retries apps.notifications | 29 passed, 0 failed, 31.003 seconds, exit 0 |
| python -B backend/run_security_tests.py apps | 307 passed, 0 failed, 61.653 seconds, exit 0 |
| node --test frontend/tests/*.test.mjs | 12 passed, 0 failed, exit 0 |
| npm run build (frontend) | TypeScript tsc -b and Vite production build passed, exit 0 |
| python -B backend/export_mobile_contract.py | 137 method/path contracts exported successfully |
| git diff --check (changed notification and new retry/concurrency files) | Passed |

Focused tests are included in the 307 full-suite total, not additive. The 14 additional tests relative to Phase 2's 293 cover the remaining concurrency/retry/notification gaps. Earlier focused iterations found a cached merge timestamp encoding mismatch; this was fixed, and the final focused and full runs pass. No failed/unexecuted checks are reported as successes.

Existing unordered FacultyProfile pagination and Vite bundle-size warnings remain. No new browser smoke test, real SMTP delivery, deployed Nginx check, or actual S3 policy test was run in Phase 2.1.

## Database and file safety

No migrations were created or applied to development/production databases. All database tests used the existing isolated runner, uniquely named disposable PostgreSQL databases and temporary media roots. Thread connections used those same isolated names, never iqac_db. Test databases were destroyed on completion. Full-suite backup/seed tests ran only against disposable fixtures. Existing PostgreSQL records, uploaded files, live credentials, roles and report history were not modified. Nothing was deployed.

## Remaining risks and limits

- Native clients must persist/reuse Idempotency-Key for generation/merge retries. No-key legacy calls intentionally generate new reports. Keys persist with the report; changing role/tenant/action changes key scope.
- PostgreSQL cannot atomically roll back storage writes. A process or storage failure can leave an orphan file; no automatic destructive cleanup is introduced.
- External webhook/email delivery is not a transactional outbox and is not guaranteed exactly once. General dispatcher cooldown deduplication remains best effort; tested workflow row locks protect database effects. New report-request sends and comments represent separate user actions and do not have a generation retry key.
- Analytics aggregate visibility is broader than record ownership on several existing endpoints; documented accurately rather than silently changing existing dashboard access. Legacy IQAC rejection target mapping also remains explicit.
- Existing schema warnings, shared-interpreter djongo dependency conflicts, long-lived access JWTs and web localStorage risks remain as documented in Phase 1.1. Use a clean dependency environment for deployment.
- Browser smoke tests, live SMTP, actual S3 privacy and deployed Nginx/TLS behavior remain environment-dependent and unverified. Polling is the initial notification strategy; FCM/APNs/device-token endpoints are future requirements, not implemented delivery.

All four requested remaining deliverables are completed and relevant automated tests pass. These limits do not authorize deployment or automatic mobile/Phase 3 development.
