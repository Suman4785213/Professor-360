# Phase 10 - Final QA and project handover

Date: 2026-11-16. **PARTIAL - handover documentation complete; release acceptance remains pending.** Production readiness: **NOT READY**. This report consolidates existing work rather than restarting phases. No deployment, publishing, destructive migration, institutional database modification or uploaded-file deletion was performed.

## Project overview and architecture

Professor360 is a multi-tenant institutional IQAC platform. The existing React website and separate Expo/React Native app use the same Django REST backend and PostgreSQL data model. Authentication is JWT-based; college, department, role and ownership scope are enforced by backend permissions/querysets and private-media authorization. Mobile navigation adds role guards but does not replace backend checks.

Repository handover locations: frontend/ (React website), backend/apps/ (domain APIs/models/services), backend/core/ (permissions, tenant scope, media, middleware and shared utilities), backend/config/ (URLs/settings), mobile/app/ (Expo Router screens), mobile/src/ (services/components/state), mobile/tests/, nginx/, docker-compose.yml, and docs/. API contracts: [mobile API reference](PHASE2_MOBILE_API_REFERENCE.md) and [architecture](PHASE2_MOBILE_API_ARCHITECTURE.md). Canonical mobile prefix is /api/v1/; legacy /api/ aliases remain. Use documented contracts rather than deriving routes from screen names.

## Completed modules and role responsibilities

Implemented scope includes institution discovery/authentication/session refresh/logout; six dashboards; faculty profile/images and authorized registration; activity drafts/uploads/submission; returned-submission recovery and multi-level verification; private evidence/document access; generated/merged reports and report handoffs; AQAR/SSR summaries/previews/exports; notification polling/read/preferences; tasks/status/comments; and role-appropriate analytics. Existing website modules remain available. Mobile does not claim full accreditation authoring parity with the website or FCM/APNs push delivery.

| Role | Responsibilities and scope |
| --- | --- |
| SUPER_ADMIN | Platform/institution administration across tenants within backend permissions |
| COLLEGE_MANAGEMENT | College oversight, authorized faculty registration, summaries/reports and task oversight |
| IQAC | College quality coordination, faculty registration, final verification and accreditation/report oversight |
| HOD | Department verification, report receipt/download acknowledgement and submission to Management/IQAC |
| DEPARTMENT_INCHARGE | Department first-level review, returned-work recovery, faculty-report selection/merge and HOD handoff |
| FACULTY | Own profile, activity drafts/evidence/uploads/submission, reports, assigned tasks and notifications |

Scope varies by endpoint; analytics visibility can be broader than individual record ownership as documented in the API reference. No blanket role permission is inferred from this table.

## Technology stack

Website: React 19, TypeScript 6, Vite 8, React Router, TanStack Query, Axios, Zustand, Tailwind and Recharts. Mobile: Expo 58.0.25, React Native 0.88.1, React 19.3, Expo Router, SecureStore and Expo native file/picker/sharing integrations, Hermes. Backend: Python 3.13, Django 5.2.17, DRF 3.16, SimpleJWT 5.5.1, PostgreSQL/psycopg2, reportlab/openpyxl/python-docx/pypdf. Deployment templates: PostgreSQL 16, Redis 7, Gunicorn and Nginx. Android build: Gradle 9.4.1/AGP 9.2.1, compile SDK 37/target 36/min 24, NDK 27.1.12297006, CMake 3.22.1, Java 21 runtime and Java 17 compiler toolchain. Versions are workspace observations, not claims about latest releases.

## Phase status and evidence provenance

| Phase | Status | Evidence / limits |
| --- | --- | --- |
| 1 / 1.1 security | Historical PASS for source remediation | 292 backend tests, 12 web tests; private media/reset and production logging/storage fixes; live SMTP/TLS remained pending |
| 2 / 2.1 API readiness | Historical PASS | 307 backend tests including 29 concurrency/retry/notification tests; 137 method/path contracts; PostgreSQL isolated transaction tests; 12 web tests and build |
| 3 mobile foundation | Historical PASS for implemented scope | Role navigation/auth/session foundation, automated checks; runtime later covered in Phase 7.1 |
| 4 / 4.1 dashboards | Historical PASS for implemented scope | 40 mobile tests; secure downloads/images, registration, merge and report summaries |
| 5 activities/verification | Historical PASS for implemented scope | 53 mobile tests; upload, draft/submission, review and returned recovery |
| 6 reports/accreditation/tasks | Historical PASS for implemented scope | 67 mobile tests; report handoffs, notifications/tasks and accreditation summaries |
| 7 / 7.1 integration | Historical PASS for emulator criteria | Actual Expo Go Android/Django workflows for six roles, upload/verification/report/task/session flows; 68 mobile tests; earlier full backend suite 308; physical release testing not covered |
| 8 release APK | **PARTIAL** | Signed release APK generated and inspected; no device connected; offline QA without authorized HTTPS backend |
| 9 production readiness | **PARTIAL** | Source review, synthetic local/S3 settings checks and deployment checklist complete; infrastructure/security operational blockers remain |
| 10 final handover | **PARTIAL** | Documentation and targeted evidence review complete; final production/device acceptance cannot be signed off |

Historical results above are taken from the named phase reports and were not rerun as full suites. Later phase totals supersede earlier totals; do not add them together.

## Current validation and targeted QA

| Check | Actual result in Phase 8/consolidated execution |
| --- | --- |
| Mobile unit/service tests | **77 passed / 11 files**, 0 failed; baseline 68, nine release/offline tests added |
| TypeScript | PASS, tsc --noEmit |
| ESLint | PASS, including final rerun after the native-only plugin correction |
| Expo Doctor | **20/20 PASS** |
| Android production bundle export | PASS, 1387 modules, 27 assets, 3.9 MB Hermes bundle |
| Backend real-HTTP integration | **3 scenarios passed**, within one passing Django harness; 25.549 seconds; disposable PostgreSQL database destroyed |
| Native Android assembleRelease | **PASS**, 22m 36s, 566 actionable tasks |
| APK signature/metadata | PASS: apksigner v2, QA RSA-3072 signer, non-debuggable release package and expected SDK/architectures |
| Production settings check | **PASS local and S3** using synthetic values; drf_spectacular.W001/W002 remain |
| Full backend / web suites | Not rerun: backend/web application code unchanged here. Latest historical evidence: 308 backend; 12 web tests and TypeScript/Vite build |
| Physical device / live release workflows | **NOT TESTED**: no connected phone and no authorized HTTPS API |

Targeted review confirms existing six-role guards, tenant/department/ownership scoping, authenticated private downloads, refresh rotation and reset safeguards in source. Earlier PostgreSQL concurrency tests cover duplicate/conflicting verification/report effects. Existing 77 mobile tests cover mocked API/native boundaries, not actual OS behavior. Phase 7.1 emulator evidence covers faculty activity upload and submission, In-charge/HOD/IQAC decisions, generated report sharing, notifications, task actions, session restoration and logout. Those results do not establish that the minified release APK works on a phone.

## Android artifact handover

- File: `F:\IQAC\mobile\release-artifacts\professor360-qa-offline-20261116-091623.apk`
- Size: **93,664,628 bytes**.
- SHA-256: `8E4F23F2613490EE7F901C223969290A9F9A9FF50C1AAA439968716893B1BCE0`
- Signature: **VERIFIED**, APK Signature Scheme v2, RSA 3072, CN=Professor360 QA.
- Certificate SHA-256: `bc2a3acf730022f572f5c4ffdbba724a87806f2ab8abc4d7d183ac82e5a16371`.
- Package/version: com.professor360.mobile.qa / 1.0.0 (1); min Android API 24.
- Purpose: offline QA release artifact. It displays an endpoint-required screen and intentionally makes no API calls. It is **not** a functional production deployment or an online acceptance build.
- APK embedded bundle checked for the offline screen and absence of prior emulator API URLs; preserved copy hash matches Gradle output. No release APK install/launch has been performed.

Build entry point: mobile/scripts/build-android-release.ps1. It requires existing JAVA_HOME/ANDROID_HOME, P360_JAVA17_HOME where needed, and private P360_KEYSTORE_PATH/P360_KEYSTORE_PASSWORD/P360_KEY_ALIAS/P360_KEY_PASSWORD variables. For online builds, supply the authorized HTTPS EXPO_PUBLIC_API_BASE_URL ending /api/v1/ and select qa or production profile. Do not paste credentials into scripts or documentation. The current QA signing material is outside the repository under the current user's LocalAppData/Professor360/qa-signing, restricted by ACL and DPAPI-protected. Assign a signing custodian and secure recoverable production key procedure; DPAPI tied to this Windows account is not an organizational backup plan. Never overwrite an existing app signing identity.

## Deployment prerequisites and remaining risks

See [Phase 9 readiness](PHASE9_PRODUCTION_READINESS_REPORT.md) for exact findings and an ordered checklist. Blocking requirements: approved HTTPS API/web/reset domains and hosting; TLS/proxy/health validation; exclusion of .env/backups/media from Docker build context; explicit Compose secret/SMTP/storage/CSRF/CSP mappings; remote PostgreSQL TLS configuration where required; least-privilege credentials; tested isolated database-plus-media restore; real private bucket/filesystem checks; SMTP delivery; approved production signing and authorized phone testing. None of these were claimed complete.

Ten moderate npm advisory package entries remain from the minimatch GHSA-g3hv-75wg-m249 chain, with zero high/critical in the existing audit. Affected entries: minimatch, @expo/fingerprint, expo, @typescript-eslint/typescript-estree, @typescript-eslint/parser, @typescript-eslint/type-utils, @typescript-eslint/utils, @typescript-eslint/eslint-plugin, eslint-plugin-expo and eslint-config-expo. Relevant exposure is Node build/lint glob-pattern resource exhaustion; no app-source import was found, and Expo's transitive audit entry alone does not prove runtime exposure. Existing dry-run offered a breaking SDK downgrade, not a demonstrated safe compatible fix. No force fix or major upgrade was applied; review upstream patches/acceptance before release. Details are retained in the Phase 8 report; no new clean-audit claim is made.

Other limits: long-lived access JWTs and web localStorage risk; best-effort external notification deduplication rather than transactional exactly-once delivery; no push service; possible orphan storage files after transaction failures; OpenAPI/pagination/web bundle warnings; native forced-light appearance warning because expo-system-ui is absent; physical keyboard/accessibility/OS file sharing and release lifecycle behavior remain unverified. No optional UI/dependency redesign was introduced to mask these limits.

QA cleanup: `C:\Users\suman\AppData\Local\Temp\p360_security_android__2y1qjht` was previously inspected as disposable QA media with fixture files. The earlier deletion restriction remains respected; it was not deleted or bypassed. It is not institutional MEDIA_ROOT. Build SDK/Gradle caches, uploaded files and signing material were preserved.

## Handover and acceptance checklist

- [x] Preserve existing website, six mobile role workflows and backend security changes.
- [x] Preserve a signed release APK with checksum and package metadata.
- [x] Record automated checks separately from historical/emulator evidence.
- [x] Deliver Phase 8, Phase 9 and Phase 10 reports and existing API references.
- [ ] Assign repository, signing, deployment, backup, monitoring and support owners; review the pre-existing dirty workspace before release commits.
- [ ] Resolve Phase 9 configuration blockers in a controlled staging change; supply approved URLs and credentials privately.
- [ ] Validate backup restoration and private evidence access in an isolated environment.
- [ ] Configure SMTP and verify password reset including expired/reused-token rejection.
- [ ] Rebuild online QA APK with approved endpoint; verify signature/hash and install on authorized phone without replacing an unrelated app.
- [ ] Execute all six role logins/dashboards, upload/submission/recovery/verification, reports/downloads, notification/task actions, restart/refresh/logout and network-denial cases using isolated records. Capture release crash logs and record device/OS/build hash.
- [ ] Resolve or formally accept advisories and remaining security/UX risks; approve production signing/package ownership and rollback plan.
- [ ] Obtain explicit deployment authorization and final institutional acceptance. No further phase or deployment is started by this handover.

**Final assessment: PARTIAL / NOT READY.** The project has a verified signed offline Android artifact and passing available automated evidence. Production use requires the infrastructure/configuration and physical release acceptance steps above.
