# Professor360 Phase 1 security remediation

Date: 2026-11-14

## Implemented fixes

- Dedicated personal-profile serializer rejects role, college, department, activation and administrative privilege changes. Faculty-profile organizational relationships are also protected.
- IQAC user creation/update is limited to Faculty, HOD and Department In-charge within its college. Institutional/platform administrators require Super Admin. Activation/deactivation/deletion of privileged accounts is restricted too.
- Password reset responses are generic. Secure random tokens are emailed, stored as SHA-256 digests, expire after one hour, and are consumed under a database transaction/row lock. Successful reset invalidates outstanding reset tokens and refresh tokens. IP throttling is applied to request and reset endpoints.
- Console, file and dummy email backends do not receive reset links. Delivery failure invalidates the token and emits a generic operational warning without secrets.
- Related model assignments are validated against the tenant. Department-less staff queries fail closed. Evidence requirements are scoped through their metrics. Shared catalogs cannot be changed by IQAC. Mapping relationships cannot be reassigned.
- Faculty may delete only their own draft activities. Other users cannot edit faculty activities. Document creation/reassignment/editing/deletion checks activity ownership and editability. Supplementary evidence uploads validate file signatures and category ownership.
- Reports exclude institution-wide files from department staff access. Foreign report types, templates and filter IDs are rejected.
- Axios stores both rotated tokens and shares one refresh operation across simultaneous failures. Logout/account changes cannot be overwritten by an old refresh.

## Files changed in this remediation

Existing changes in the workspace were preserved. This list identifies files touched by this task, not all files reported by git status.

- backend/apps/accounts/serializers.py
- backend/apps/accounts/views.py
- backend/apps/accounts/tests_phase2.py
- backend/apps/accounts/tests_security.py (new)
- backend/apps/activities/serializers.py
- backend/apps/activities/views.py
- backend/apps/criteria/serializers.py
- backend/apps/criteria/views.py
- backend/apps/evidence/services.py
- backend/apps/evidence/views.py
- backend/apps/reports/serializers.py
- backend/apps/reports/services.py
- backend/apps/reports/views.py
- backend/apps/verification/views.py
- backend/config/settings/base.py
- backend/core/mixins.py
- backend/core/throttling.py
- backend/core/serializers.py (new)
- backend/run_security_tests.py (new)
- frontend/src/api/client.ts
- frontend/tests/auth-refresh.test.mjs (new)
- docs/PHASE1_SECURITY_REMEDIATION.md (new)

## Verification

Final backend command, from workspace root:

```
python -B backend/run_security_tests.py apps.accounts apps.activities apps.verification apps.evidence apps.criteria apps.reports apps.notifications apps.colleges.tests_college_registration
```

122 passed, 0 failed: 23 new security regression tests and 99 existing tests. Earlier targeted security runs passed 14 and then 22 tests as coverage expanded. A new report catalog test initially failed because a foreign college field was ignored; explicit rejection was implemented and the final 122-test run passed.

Frontend commands, from frontend/:

```
node --test tests/auth-refresh.test.mjs
npm run build
```

4 refresh-client tests passed, 0 failed. TypeScript and Vite production build passed. Vite reports a bundle-size warning. Django reports an existing unordered FacultyProfile pagination warning. Git diff whitespace check passed for the tracked remediation files.

The tests verify all six roles can log in, rotated refresh tokens invalidate old tokens, legitimate personal edits and faculty registration permissions, and the included existing verification/report workflows. They do not establish that every dashboard renders correctly in a browser. No live email delivery or production deployment was tested.

## Database safety

The dedicated runner replaces the application database name before Django setup and creates a uniquely named test_p360_security_<random> PostgreSQL database. Each run applied migrations only in that disposable database and destroyed it afterward. Uploaded test files went to a temporary directory. No migrations, seeds, reset commands or record changes were run against iqac_db. No application model migrations were added by this remediation.

## Manual configuration and remaining risks

1. Configure a real email backend and PASSWORD_RESET_URL pointing to a controlled HTTPS reset form. The current React application has no reset-password route; a reset form must exist before that URL is usable. Live delivery remains unverified. Console/file/dummy delivery is deliberately unavailable, without exposing tokens to callers.
2. Use a shared production cache and edge rate limiting for consistent multi-worker throttling. Django's cache-based throttling is not an atomic distributed brute-force defense.
3. DEBUG media serving still exposes local media paths outside API authorization. Do not expose development settings publicly. Private storage/proxy media access and every raw media URL need deployment hardening and verification before production release.
4. Existing production settings refer to an undefined core logging entry. Dependency declarations omit several report/import/AI and optional S3 dependencies. These deployment issues were not changed in this focused remediation.
5. Access JWTs retain their configured eight-hour lifetime. Blacklisting refresh tokens after reset does not immediately revoke already-issued access JWTs. The web client still stores JWTs in localStorage, so XSS prevention remains important.
6. Existing verification atomicity/returned-stage recovery, placeholder integrations and fabricated profile details remain outside these focused changes.
7. No UI/branding/navigation source files were changed by this task. The production build passed, but live dashboard smoke testing remains outstanding.

## Original Phase 1 status (superseded by Phase 1.1 below)

PARTIAL: requested critical account/API fixes and regression tests are implemented and passing. End-to-end release readiness remains blocked by private-media serving hardening and password-reset form/email configuration; production settings/dependency issues and browser smoke testing also remain outstanding. Do not treat this report as production security approval. No Phase 2 or mobile implementation was started.


# Phase 1.1: Remaining security blockers

Date: 2026-11-14. This section supersedes the original blocker list above.

## Resolved blockers

- Removed Django's DEBUG static-media route. `/media/<path>` now resolves registered model files and requires JWT authentication except for active institutional logos. It never serves arbitrary filesystem paths. Existing files were not moved, renamed or deleted.
- The gateway scopes documents/certificates, resumes/photos, avatars and generated reports to college, department and faculty ownership. Super Admin retains cross-college access. Department-less staff fail closed. Support attachments and report templates have explicit access rules; unknown files, backup paths and AI intermediates are denied.
- Fixed an additional report-download bypass: the action previously used its own permissive lookup and allowed department staff to download reports without a department. It now uses the authorized report queryset before opening any file.
- Local and S3 storage emit application gateway URLs instead of direct bucket URLs. S3 server-side file reads remain supported. Nginx proxies `/media/` to Django with authorization headers rather than exposing a media directory.
- Private responses use `private, no-store`. The service worker excludes API/media/reset requests and advances its cache version to invalidate old caches. File/image wrappers use the existing Axios bearer flow and never forward credentials to other origins. Existing screen styling is preserved.
- Added `/reset-password`, available before the authenticated dashboard gate, with new-password confirmation, an email-link request form, success/error states and sign-in navigation. Added a small Forgot password link to existing login forms.
- Reset links use URL fragments, so the token is not sent in browser HTTP request URLs/referrers or normal access logs. Backend responses remain generic and stored tokens remain hashed, expiring and single-use. Nginx access logging omits query strings and referrers. Production validates that PASSWORD_RESET_URL is a fixed HTTPS URL without credentials/query/fragment.
- Fixed missing production `core` logger initialization. Added declared report/extraction dependencies and the django-storages S3 extra. Private S3 objects use no-store cache metadata.

## Phase 1.1 files changed

Backend implementation/configuration:
- `backend/core/media.py` (new), `storage.py` (new), `s3_storage.py` (new), `middleware.py`
- `backend/config/urls.py`, `settings/base.py`, `settings/production.py`
- `backend/apps/accounts/views.py`, `backend/apps/reports/views.py`
- `backend/requirements/base.txt`, `backend/requirements/production.txt`
- `backend/.env.production.example`, `backend/verify_production.py` (new)
- `nginx/nginx.conf`

Frontend:
- `frontend/src/App.tsx`, `frontend/public/sw.js`
- `frontend/src/api/privateMedia.tsx` (new)
- `frontend/src/features/auth/LoginView.tsx`, `ResetPasswordView.tsx` (new), `resetPassword.ts` (new)
- Existing file links/images adapted without layout changes in `components/layout/Header.tsx` and features `admin/AdminSupportManagement.tsx`, `criteria/MetricDetailView.tsx`, `dashboard/HODDashboard.tsx`, `dashboard/IQACDashboard.tsx`, `dashboard/InchargeDashboard.tsx`, `dashboard/ManagementDashboard.tsx`, `evidence/EvidenceDetailView.tsx`, `faculty/FacultyProfileView.tsx`, `notifications/NotificationCenter.tsx`, `support/SupportCenter.tsx`.

Tests/documentation:
- `backend/apps/accounts/tests_phase11_security.py` (new), `tests_security.py`, `tests_phase2.py`
- `backend/apps/reports/tests_phase6.py`, `backend/apps/ai/tests_phase7.py`, `backend/apps/colleges/tests_phase11.py`, `backend/apps/imports/tests_phase14.py`, `backend/apps/integrations/tests_phase16.py`
- `frontend/tests/password-reset.test.mjs` (new), `frontend/tests/private-media.test.mjs` (new)
- This report.

These lists exclude unrelated pre-existing workspace changes. No logos, colors, sidebar/navigation structure or academic business features were redesigned.

## Actual verification

- Focused PostgreSQL security run: **32 passed, 0 failed** (`apps.accounts.tests_security apps.accounts.tests_phase11_security`). Includes real temporary private files, unauthenticated direct paths with DEBUG enabled, foreign college, wrong faculty/department, Super Admin, existing report/document downloads, public branding, unknown/traversal paths, invalid bearer/query-token attempts, and local/S3 gateway URL generation.
- Full PostgreSQL regression command: `python -B backend/run_security_tests.py apps`: **292 passed, 0 failed**, exit code 0. Final run completed in 32.033 seconds and destroyed its disposable database. Django system checks reported no issues. These 292 tests include the 32 focused security tests, rather than being additional to them.
- Frontend command: `node --test frontend/tests/*.test.mjs`: **12 passed, 0 failed**: 4 refresh tests, 5 reset logic/rendering tests and 3 private-media client tests. Component rendering uses React server rendering; it is not a browser end-to-end test.
- `npm run build` from frontend: **PASS**, including TypeScript `tsc -b` and Vite production build. Bundle-size warning remains.
- `python -B backend/verify_production.py`: **PASS for local and S3 production settings**, using synthetic host/secret/storage values and an intentionally unusable database port. No deployment, real S3 call or real database access. Existing `drf_spectacular.W001/W002` schema warnings remain; no Django security-check warnings were reported.
- S3 dependency installation succeeded. `pip check` in the shared system Python environment reports an unrelated installed `djongo` package incompatible with Django/PyMongo/sqlparse. Professor360 does not declare djongo. Use a clean project environment; the shared interpreter must not be treated as a reproducible deployment environment.
- No Nginx executable was available for `nginx -t` or live proxy testing. Its configuration was inspected; runtime validation is pending.
- `git diff --check` identifies a pre-existing blank-line warning in FacultyDashboard.tsx; no security check was bypassed to suppress it.

The first full run exposed stale tests: legacy integration URLs, old health response fields, an obsolete file-validation message, a quota fixture uploading into a verified activity, and expected 403s where non-disclosing report 404s now apply. Tests were updated to the registered endpoint/current response and to use an editable quota-test draft, retaining denial/quota/isolation assertions. No security protections were disabled. Streaming tests were moved to TransactionTestCase because closing real FileResponses closes request database connections; this was test lifecycle correction, not an application change.

## Browser smoke testing

A localhost frontend preview was started and stopped. Attempting to open the reset page through the browser tool failed with **"The browser access host is unavailable."** No successful browser navigation occurred. All six role logins, dashboard navigation, reset page, authorized downloads and unauthorized rejection remain **UNVERIFIED IN A BROWSER**. Backend tests exercise six-role login and file authorization; these must not be represented as browser smoke tests. No real institutional accounts were used.

## Email delivery and exact deployment requirements

Live delivery is **UNVERIFIED**. Automated reset tests use Django's in-memory mail outbox. No real messages were sent and no SMTP credentials were added or changed.

Configure in deployment secrets/environment:

```
PASSWORD_RESET_URL=https://<your-frontend-host>/reset-password
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=<your SMTP hostname>
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<SMTP account>
EMAIL_HOST_PASSWORD=<secret supplied by your secret manager>
DEFAULT_FROM_EMAIL=<verified sender address>
```

Use the provider's actual port/TLS requirements. Production settings are required for SMTP delivery; development settings deliberately select the console backend, which reset delivery refuses. Console/file/dummy backends never receive token-bearing links. Verify sender authorization and delivery using a disposable account before rollout. The fixed URL must route to the React application; the emailed token is appended as `#token=...`, never query text. Any upstream proxy/APM must avoid logging request bodies containing passwords/tokens.

## Private media deployment status and remaining risks

Application authorization: **PASS in automated tests**. Physical existing files remain in place, and all local URLs route through Django even with DEBUG. Authenticated access uses bearer headers, never query credentials. Raw URL copy/paste without authentication intentionally fails.

Deployment obligations: use private buckets with S3 Block Public Access enabled and no public object/bucket policies; never create an Nginx/static/CDN alias for private media. Django cannot retroactively revoke a publicly configured bucket or a URL already shared outside the application. Real bucket policies, TLS termination and deployed proxy behavior were not accessed or verified. Existing S3 migration/demo-provider behavior was not exercised; do not run a storage migration based solely on these tests.

Remaining non-blocking/code-external risks: browser smoke testing, live SMTP, real S3 permissions and Nginx runtime verification; shared Python environment conflicts; existing OpenAPI/schema warnings and pagination/bundle warnings. Previous access-token lifetime/localStorage and broader verification-workflow concerns remain as recorded above. No claim of a comprehensive system-wide penetration test is made.

## Data safety

Every database test used the dedicated runner's uniquely named `test_p360_security_*` PostgreSQL database and temporary media directories. Full-suite backup/seed tests operated only on these disposable databases. Tests destroyed their databases afterward. No dev/production database credentials were changed. No migrations were authored or run against `iqac_db`, no real records or uploads were modified, and nothing was deployed. Phase 2/mobile implementation was not started.

## Final Phase 1.1 status

**PASS for the requested source-code security remediation and automated regression checks.** Private-media authorization, the React password-reset flow, and the production logging/storage/dependency configuration blockers are resolved in the workspace. All 292 backend tests, all 12 frontend tests, TypeScript checks, Vite production build, and isolated local/S3 production-settings checks pass.

This is not production deployment approval or a claim of verified live delivery. Browser smoke tests for all six roles, live SMTP delivery, deployed Nginx/TLS behavior, and actual S3 bucket permissions remain environment-dependent and UNVERIFIED. Complete those checks with disposable accounts and a clean dependency environment before rollout. No deployment, Phase 2, or mobile application work was performed.
