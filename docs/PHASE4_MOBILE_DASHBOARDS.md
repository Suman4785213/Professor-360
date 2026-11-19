# Phase 4 mobile dashboards

Original Phase 4 status (superseded by Phase 4.1 below): **PARTIAL**. Six distinct role-based dashboard compositions and API-backed read views are implemented. Full requested functionality is not yet complete: authenticated native file downloads/profile images, faculty registration, merge selection and department pending-report summary still need mobile implementations. No Phase 5 was started.

## Implemented

Super Admin: institutional directory and server total, subscription list/status, backend system health including platform_counts (total/active/suspended colleges) and service statuses, recipient notifications and assigned tasks. No payment or administrative mutation operations added.

Management: college academic overview, faculty participation/category breakdown including server-provided FDP/publication categories, department cards with faculty/FDP/publication fields, faculty directory, available reports and notifications/tasks. Registration is explicitly unavailable rather than a broken action.

IQAC: college academic overview, server verification status counts, pending IQAC queue, faculty participation/categories, departments, reports, backend executive AQAR/SSR preparation KPIs, assigned tasks and recipient notifications. No compliance calculations performed locally.

HOD: department-context overview, faculty directory, PENDING_HOD queue, received report list and submitted-to-HOD/admin flags where returned by the custom report endpoint, available reports, tasks and notifications.

In-charge: department overview/directory, pending plus returned-to-in-charge queue, report requests/faculty responses, report list, notifications/tasks. Merge is explicitly unavailable for now; no device-side merge or report mutation was implemented.

Faculty: own activity/status and category breakdown from scoped analytics, activity/document lists, personal task and notification previews, existing profile access. College-wide faculty counts are deliberately omitted from faculty cards. Profile image/private native file handling remains incomplete; no replacement details or image were fabricated.

All roles retain the existing protected layouts and secure logout/cache clearing. Dashboard sections are selected only from the authenticated role. Missing institution assignment, or missing department for Faculty/HOD/In-charge, stops dashboard queries and displays an actionable error. Cache keys include user, role, college, department and section. Direct section navigation is checked against the same allowed registry and inherited role layout. Backend permissions remain authoritative.

## Components and files

Created mobile/src/components/dashboard.tsx: DashboardHeader, WelcomeCard, StatisticCard, QuickActionGrid, ActivitySummary, NotificationPreview, TaskSummary, DepartmentCard, FacultyCard, ReportCard, VerificationStatusBadge, LoadingState, EmptyState and PullToRefresh; reuses existing ErrorState. Several record-card exports share the same native implementation. No browser UI components copied.

Created mobile/src/features/dashboards/contracts.ts, useDashboard.ts, SectionView.tsx and Detail.tsx. Replaced the shared foundation Dashboard.tsx with role-specific compositions. Added section.tsx in each of the six existing app role directories. Extended Screen with refreshControl and user schema with department/designation/avatar fields. Added mobile/tests/dashboards.test.ts. Updated mobile/README.md and this report. Website/backend sources and existing branding were unchanged by this phase.

The feature hook uses TanStack infinite queries; lists accept backend arrays or {results,count,next}. Previews show up to three records, with View actions opening full lists and Load more following the returned next URL through the existing origin-protected API client. Page size is not confused with a server total. Pull-to-refresh refetches active dashboard queries; failures remain visible per section. No unsafe automatic mutation retries added.

## Exact API calls

All below are GET under /api/v1/, except next-page URLs returned by the backend may use the existing /api/ alias.

| Endpoint | Mobile roles |
| --- | --- |
| colleges/ | Super Admin |
| subscriptions/ | Super Admin |
| system/health/ | Super Admin |
| analytics/overview/ | All institutional roles; underlying backend role scope retained |
| analytics/faculty-participation/ | Faculty, Management, IQAC |
| analytics/executive/ | IQAC (backend AQAR/SSR preparation KPIs) |
| departments/ | Management, IQAC |
| auth/faculty/profiles/ | Management, IQAC, HOD, In-charge |
| verifications/?current_status=PENDING_HOD | HOD |
| verifications/?current_status=PENDING_IQAC | IQAC |
| verifications/?current_status__in=PENDING_INCHARGE,RETURNED_TO_INCHARGE | In-charge |
| reports/ | Management, IQAC, HOD, In-charge |
| reports/hod-downloaded-reports/ | HOD |
| notifications/incharge-requests/ | In-charge |
| activities/ | Faculty |
| documents/ | Faculty |
| tasks/?owner=<authenticated user UUID> | All six roles |
| notifications/ | Recipient across all roles |

Existing profile, notifications and logout routes/services remain in place. Backend serializers and web dashboard integrations were inspected. Native refresh behavior follows https://reactnative.dev/docs/refreshcontrol and Expo SDK 58 reference https://docs.expo.dev/versions/v58.0.0/.

## Actual validation

- npm test (mobile): **30 passed**, 4 files, zero failed. Includes the 19 foundation/auth/text tests and 11 dashboard tests: six role registries, missing-context denial, correct queue states, pagination/empty/malformed-list mapping, faculty count privacy, refresh settlement when a section fails. Existing session/logout/cache and all role-guard combinations remain passing.
- npm run typecheck: passed, exit 0.
- npm run lint: passed, exit 0, no warnings/errors.
- npx expo-doctor: **20/20 passed**.
- Android Hermes export: passed, 1332 modules, 27 assets, 3.7 MB bundle. Final export confirmation appended below after the last whitespace correction.
- adb devices: no attached device. emulator -list-avds: no configured AVD. Android runtime/APK installation and live backend login/dashboard calls: **UNVERIFIED**. API contracts were inspected in source; automated tests do not establish live tenant authorization or render all six screens on a device.
- Website frontend tests/build were not rerun in Phase 4 because no website source or dependencies were affected. Historical Phase 3 website result is 12 tests/build passing; it is not a newly executed Phase 4 check.
- Backend suite was not rerun: backend unchanged; no database connection or institutional records used for dashboard development/testing.

## Remaining work and limits

Complete native authenticated report downloads and profile images, faculty registration, backend merge selection/submission UI, department-wise/pending Management report overview, and fuller certification/profile presentation. Add rendered-component loading/error/401/403 tests and device end-to-end smoke tests: current dashboard tests verify contracts/guards/state mappings, not every native rendering state. Existing API lists/errors/loading/empty states are implemented, but native appearance and interactions remain unverified.

Institutional analytics retain the backend's existing semantics; do not interpret category labels as verified-only totals. Mobile renders server verified counts separately. No synthetic statistics, fake success responses or authoritative client compliance scoring. Health/notification/task previews show returned server data only.

Existing SDK dependency moderate advisories from Phase 3 remain; no dependency changes or forced audit fixes in this phase. Configure a compatible emulator or authorized disposable test device and isolated test backend before runtime validation. No real PostgreSQL records/uploads were modified. No Phase 5 implementation started.

Final Android export after whitespace correction: exit 0, 1332 modules, 27 assets, 3.7 MB Hermes bundle. Phase 4 remains PARTIAL for the outstanding functionality and runtime checks listed above.


# Phase 4.1 completion

Date: 2026-11-14. **Final Phase 4 status: PASS for implemented dashboard functionality and available automated checks.** This section supersedes the earlier incomplete-feature list. Native device/live-backend verification remains environment-dependent and unverified.

## Completed features

- Native authorized downloads for documents, evidence primary/supporting attachments, and generated/merged reports. The existing Axios client requests arraybuffer bytes using bearer headers and its coordinated refresh flow. Only same-origin resource URLs are accepted by that client; tokens are never appended to URLs. MIME mapping supports PDF, XLS/XLSX, DOC/DOCX, JPEG and PNG. JSON/error responses and unexpected content types are rejected before writing a file. Expo FileSystem stores bytes in a dedicated private cache directory; Expo Sharing opens the OS open/save/share chooser only after a successful download. Sharing unavailable/permission/network errors are displayed. Exporting via the OS chooser intentionally lets the user share the file outside app-private storage.
- Download completion checks the session epoch before writing/returning/sharing; files are removed after sharing. Avatar bytes use the same authorized download transport. Files are released on avatar unmount and removed when sessions clear; the dedicated directory is also cleared when the service loads to remove leftovers from prior process termination. OS deletion failures are best effort. Previously exported copies in other apps cannot be revoked by logout.
- Authenticated avatars on personal profile and faculty directory cards, with initial-letter fallback, loading, retry and image errors. Avatar content remounts on identity/URL changes. Profile image source prefers faculty_profile.profile_photo, then avatar. No image-editing operation was added; this phase provides image reads and uses existing backend private URLs.
- IQAC/Management registration is reachable through their existing protected section screen. Departments are loaded through all returned pages. Zod validates required names/email/password/confirmation/department; submitted college is fixed to the actor's institution. Service and screen check authorized roles; the department must be in the fetched authorized list. Backend errors are displayed. Successful response shows registration confirmation and refreshes dashboard data. Newly registered faculty tokens returned by Django are discarded; the administrator remains signed in. No public registration route or backend permission change.
- In-charge merge screen lists completed stored faculty PDF reports, selection, progress, retry/result and native merged-file download. Calls the backend merge service; no local PDF merging. Concurrent identical requests share a promise; conflicting selection while running is rejected. The same selection retains its Idempotency-Key for retries in that mounted workflow. Successful UI disables accidental repeated submission. Selection/key persistence across process termination is not claimed; re-entering the screen is a new workflow.
- Faculty now has its own reports list. In-charge reports use the stored-report endpoint for actual submission flags; HOD retains its received-report/submission view. Management and IQAC list scoped generated reports with returned statuses, department labels and download links. No unsupported pending/submission totals are inferred from a page or invented where the serializer omits handoff fields.
- Evidence cards open a supporting-attachment list from the evidence detail endpoint. Existing dashboard View actions route registration/merge to the correct working screen; arbitrary section IDs still fail closed. Other read views retain pagination/loading/empty/error states and six-role guards. Activity verification decisions and broader later-phase tools remain outside this request.

## Files created/modified in Phase 4.1

New: mobile/src/services/privateFiles.ts, cleanup.ts; mobile/src/components/PrivateMedia.tsx, EvidenceFiles.tsx; mobile/src/features/dashboards/actions.ts, Registration.tsx, Merge.tsx; mobile/tests/dashboard-actions.test.ts, private-files.test.ts.

Updated: mobile/src/services/runtime.ts (private cache cleanup hook); mobile/src/components/dashboard.tsx (download/avatar/attachment actions); mobile/src/features/Profile.tsx; mobile/src/features/dashboards/contracts.ts, Detail.tsx, SectionView.tsx, useDashboard.ts; mobile/src/types/index.ts; mobile/package.json, package-lock.json, app.json (Expo-compatible native dependencies/plugin); this report. Existing source formatting was normalized in touched files. The existing root app/ layout was retained.

## API integrations added

- POST /api/v1/auth/register/faculty/: actor-bound college plus first_name,last_name,email,department,password,confirm_password, optional employee_id,designation,phone. Backend relationship validation remains authoritative.
- GET /api/v1/departments/ and server-provided next pages: authorized registration choices.
- GET /api/v1/reports/incharge-stored-reports/: merge eligibility and actual submission flags.
- POST /api/v1/reports/merge-reports/: {report_ids:[UUID,...]} with Idempotency-Key; result's download_url is used directly through the protected API client.
- GET /api/v1/evidence/{id}/: supporting_documents gallery with authorized DocumentSerializer download URLs.
- Existing document download URLs, /media/<path>, and report download URLs: authenticated binary transport. No direct storage/bucket access added.

SDK-specific APIs checked against https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/ and https://docs.expo.dev/versions/v58.0.0/sdk/sharing/. Added expo-file-system and expo-sharing through expo install, retaining SDK compatibility.

## Actual validation

- npm test: **40 passed**, 6 files, zero failed. Ten new tests cover binary save/sharing, MIME handling for Office/images, rejection of forbidden/JSON responses, authenticated image bytes/cache cleanup, account-switch rejection, actor-bound registration/token discard, unauthorized/foreign-department rejection, backend validation errors, merge duplicate promise/retry key, and role navigation. Existing refresh/role/logout/cache/text tests remain passing. Native modules and API responses are mocked in unit tests; they are not real backend/device operations.
- npm run typecheck: passed, exit 0.
- npm run lint: final outcome appended below.
- npx expo-doctor: **20/20 passed**, exit 0.
- Android export: initial Phase 4.1 export passed, 1361 modules, 27 assets, 3.8 MB Hermes bundle; final export outcome appended below.
- adb devices: no connected device; emulator -list-avds: no configured AVD. No APK installation, native share-sheet/image rendering or live backend login/registration/merge was tested. Configure an emulator or connect an authorized test device and use disposable institutional accounts to complete those checks.
- Existing website tests/build were not rerun because website source/dependencies were unchanged. Historical frontend passing results remain historical. No backend tests rerun because backend unchanged. No development/production PostgreSQL records or existing uploads were accessed/modified. No deployment, migrations or Phase 5 work.

## Remaining limitations

Native download buffers are held in memory before private-file writing; very large reports may require a streaming transport in a later phase. Sharing targets and supported Office viewers depend on installed apps. Refresh is provided by the already-tested API client; live token rotation through native file downloads remains a device test. Registration has no automatic mutation retry, so ambiguous timeouts should be resolved by checking the directory before intentionally submitting again. Backend returns faculty tokens to authorized registrars; mobile discards them without replacing the session.

No generic native profile-image picker/upload was introduced. Report summaries faithfully show available server fields; Management/IQAC report list serializers do not expose every HOD handoff flag, so mobile does not manufacture that information. These API limitations are labeled by omission rather than fake counts. Existing moderate Expo/ESLint dependency advisories remain; no forced incompatible upgrades. Device, deployment privacy/SMTP/S3/Nginx validations from earlier phases remain pending.

Stop after Phase 4.1. PASS here covers the remaining requested dashboard actions and passing available checks, not release approval or a claim of live-device verification.

Final Phase 4.1 verification: ESLint exit 0 with no warnings/errors; final Android export exit 0, 1361 modules, 27 assets, 3.8 MB Hermes bundle. Final status PASS with device/live-backend checks pending.
