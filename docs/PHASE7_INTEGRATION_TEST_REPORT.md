# Phase 7: Android and Django integration testing

## Final Phase 7.1 result ? 2026-11-15

**PASS for Phase 7.1 emulator integration criteria.** Reused Android Studio on H: and its bundled JDK, installed only the approved missing SDK tools/image, and booted Professor360_QA_API35. The actual Expo Go Android app connected to the existing Django backend using isolated PostgreSQL and temporary media.

All six roles logged in and loaded live dashboards. Android exercised institution search, session restoration/logout, faculty activity creation, PDF/image uploads, submission, In-charge/HOD/IQAC approval through VERIFIED_EVIDENCE, private profile images, authenticated document and generated-report downloads to the share sheet, notification read counts, and task creation/completion/comments. A confirmed blank-dashboard bug was fixed by preserving native RefreshControl identity; generated route typing errors were also corrected.

Final checks: **68 mobile tests, TypeScript, ESLint, Expo Doctor 20/20, Android Hermes export passed**. A fresh isolated Django HTTP harness passed its three mobile-service scenarios. The earlier full backend result remains **308 passed**, not a new full-suite execution. Website source was unaffected by this continuation.

See [the final Android runtime report](PHASE7_ANDROID_RUNTIME_REPORT.md) for installation paths, changed files, exact test scope, cleanup and remaining release checks. Ten moderate dependency advisories remain; standalone APK/physical-device/release-splash validation is pending. No deployment or Phase 8 work occurred.

## Historical Phase 7 checkpoint (before approved SDK installation)

Everything below records the earlier checkpoint. Its runtime blockers, PARTIAL decision and proposed next steps are historical and superseded by the Phase 7.1 result above. Earlier regression/advisory evidence remains identified as such.

## Environment and launch result

| Check | Result |
| --- | --- |
| Node / npm / Python | PASS: v22.18.0 / 10.9.3 / 3.13.5 |
| Django / PostgreSQL driver | PASS: Django 5.2.17; psycopg2 available; PostgreSQL tests executed |
| Android SDK | Present at `%LOCALAPPDATA%\Android\Sdk` |
| ADB | PASS: 1.0.41, package 37.0.1-15733141 |
| Emulator binary | Present: 37.1.11.0 |
| Hardware acceleration | PASS: `emulator -accel-check` reports AEHD 2.2 installed and usable |
| System-image directories | android-37.1 and android-37.2-beta3 present; presence alone does not establish a usable AVD |
| Configured emulators | BLOCKED: `emulator -list-avds` returned no AVDs |
| Physical devices | BLOCKED: `adb devices` returned no devices |
| Java/JDK | BLOCKED for local native build: `Get-Command java` found nothing on PATH; checked conventional Android Studio JBR path was absent |
| Expo CLI / dependency health | PASS: CLI export works; Expo Doctor 20/20 |
| Development-client APK / installation | NOT RUN; no runtime target, no installed development client verified |
| Actual application launch | BLOCKED; no emulator/device target |

No Android UI automation, screenshots, splash inspection, keyboard/safe-area checks, small-screen review, native file picker, image rendering, OS sharing, SecureStore persistence, background/resume or native network-interruption test was performed. These remain release blockers, not passing UX findings.

## Repeatable real HTTP integration

Run from the workspace root:

```powershell
python -B backend/run_security_tests.py apps.accounts.tests_mobile_http
```

The existing security runner creates a random `test_p360_security_*` database on the existing PostgreSQL service and a temporary `p360_security_*` media directory. The new test refuses fixture creation unless PostgreSQL, database prefix and media-directory checks pass. It uses Django's existing application and schema, not a second application backend or persistent database. Django destroys the disposable database after the run; temporary uploads/reports are cleaned up by the runner. No test operation points at the institutional database.

A loopback Django live server binds an allocated port. Disposable accounts have a freshly generated password passed to the child process through its environment, never written into source/configuration or printed. Node/Vitest imports the actual mobile session, activity and operations services and uses Axios HTTP transport, not mock adapters or force-authentication. Django authenticates the actual login/JWT requests. The suite uses an in-memory token vault instead of native SecureStore and Node multipart Blob/FormData instead of native picker URI uploads. It therefore proves service/backend integration, not native end-to-end behavior.

The server's handler deliberately uses the application's WSGI handler. Django LiveServerTestCase normally wraps it with a test-only media handler that serves files without application authorization; using that default produced a false security failure. The harness now exercises the actual private-media URLconf and middleware without that wrapper. No application authorization was weakened.

## Executed workflow results

| Important test | Result and scope |
| --- | --- |
| Institution search | PASS over HTTP: public search returns disposable institution; selected institution ID used for login. Selection UI BLOCKED on Android |
| Six-role authentication | PASS over HTTP for Faculty, Department In-charge, HOD, IQAC, College Management, separate Super Admin portal; actual mobile user schema accepts responses |
| Session restoration | PASS: new mobile session client loads in-memory vault and calls authenticated `auth/me/`. Native SecureStore restoration BLOCKED |
| Refresh rotation | PASS: invalid access token triggers actual coordinated client refresh; rotated refresh differs and previous refresh is rejected with 401. Naturally elapsed token expiry NOT RUN in this suite |
| Logout | PASS: local vault cleared, logged-out refresh rejected with 401. Existing access JWT lifetime is not shortened by refresh blacklisting |
| Wrong-role navigation | PASS in existing unit guard tests only; native route navigation BLOCKED. Actual Faculty attempt at in-charge approval rejected with 403 |
| Draft create/edit | PASS through mobile workflow service and real Django; edited title asserted |
| Evidence upload | PASS: actual authenticated multipart PDF-signature fixture accepted; native picker/progress/cancellation BLOCKED. Fixture tests transport/signature acceptance, not PDF viewer rendering |
| Authorized document download | PASS: downloaded bytes exactly equal uploaded bytes, both download endpoint and private-media gateway |
| Unauthorized private media | PASS: anonymous direct-file request rejected; foreign tenant direct-file and download requests return 404 |
| Correction/resubmission | PASS: in-charge returns to Faculty, Faculty edits and resubmits |
| Three-level verification | PASS: in-charge approval, HOD return to in-charge, recovery/reapproval, HOD approval, IQAC final verification; final VERIFIED_EVIDENCE and one evidence record asserted |
| Duplicate decision/history | PASS: repeated final decision returns 400; verification history contains the performed transitions. Existing concurrency tests also pass in full backend suite |
| Dashboard visual/count refresh | BLOCKED on Android; existing mocked invalidation/contract tests pass, no live visual claim |
| PDF/Excel/Word reports | PASS: real Faculty generation returns COMPLETED, authenticated download succeeds, bytes have PDF/ZIP-container signatures. File contents were not visually rendered in Office/PDF viewers |
| Report merge and handoff | PASS: actual in-charge faculty-report generation, merge, same-key replay preserves report ID, submit to HOD, HOD acknowledgement, submit to IQAC/Management, both recipients download successfully |
| Report tenant isolation | PASS: foreign Faculty download returns 404 |
| AQAR/SSR and catalogs | PASS: IQAC HTTP reads for dashboards, criteria, metrics and evidence mappings return 200. Populated evidence-to-metric UI navigation NOT RUN in new HTTP suite; backend criteria/evidence regression tests pass |
| Report requests | PASS: in-charge creates request, Faculty responds Okay and marks read; foreign recipient cannot retrieve it |
| Notifications | PASS: mark read/all, unread count reaches zero, recipient isolation. Native notification navigation/polling lifecycle BLOCKED; whitelist navigation unit tests pass |
| Tasks | PASS: Faculty creates self-owned task, starts, comments, completes; comment/history reads asserted; foreign tenant detail denied; Management mutation denied |
| Push delivery | NOT RUN; no FCM/APNs delivery implementation claimed |

## Commands and final automated results

| Command | Actual result |
| --- | --- |
| `python -B backend/run_security_tests.py apps.accounts.tests_mobile_http` | PASS: 1 Django harness test running 3 real HTTP scenarios |
| `python -B backend/run_security_tests.py apps` | PASS: **308 backend tests**, 69.934 seconds, exit 0; includes the harness with **3/3 HTTP scenarios** passing after the final private-file assertions |
| `npm test` in mobile | PASS: **67 tests, 8 files**, zero failures; these are unit/source/native-boundary tests, separate from HTTP scenarios |
| `npm run typecheck` in mobile | PASS, exit 0 |
| `npm run lint` in mobile | PASS, exit 0, no errors/warnings |
| `npx expo-doctor` in mobile | PASS: **20/20**, exit 0 |
| `$env:EXPO_PUBLIC_API_BASE_URL='https://example.invalid/api/v1/'; npx expo export --platform android --max-workers 2` | PASS: 1387 modules, 27 assets, 3.9 MB Hermes bundle, exit 0. Synthetic origin used only for export; never a working backend/release configuration |
| Existing React website tests/build | NOT RUN: website source and dependencies unaffected by Phase 7 |
| Android launch / Android-to-Django connection | BLOCKED: no runtime target; Node-to-Django HTTP success does not establish Android connectivity |

The full backend suite emitted an existing unordered FacultyProfile pagination warning. Its backup/seed tests operated within the random disposable test database and temporary files, not institutional records. `pg_dump` was absent on PATH; the existing backup regression exercised its dumpdata fallback successfully.

Initial harness attempts failed due to a workspace-path calculation, Windows console Unicode encoding, incomplete test-form defaults, and Django's test media wrapper. Those harness defects were corrected and final runs passed. No product-code defect was established by these tests; no application behavior or security setting was changed to obtain success.

## Connectivity and security review

Mobile runtime uses `EXPO_PUBLIC_API_BASE_URL` with canonical `/api/v1/` suffix; development fallback is emulator host `http://10.0.2.2:8000/api/v1/`. Release runtime rejects non-HTTPS configuration. The HTTP integration instead uses a dynamically allocated loopback origin in Node; it does not overwrite the app environment or prove emulator/LAN reachability.

The shared Axios client uses a 15-second timeout, bearer headers and coordinated 401 refresh; it rejects foreign resource origins before injecting authorization. Tokens are not added to download URLs. No token/config/credential dump is emitted by the integration failure handler. Native private storage and cleanup remain unit-tested only. Slow report generation/upload behavior under real device networking remains unverified; the timeout was not increased speculatively.

Source inspection: development settings currently use wildcard ALLOWED_HOSTS; production settings require explicit hosts, forbid wildcard hosts and default to SSL redirect. These existing settings were not changed. For a device test, use an explicitly configured disposable environment with exact allowed hosts. Native React Native requests are not governed by browser CORS; do not enable global CORS as an Android connectivity workaround. Browser CORS and deployed proxy/TLS certificates were not tested here. No production secrets or live database credentials were changed. This is a targeted configuration review, not a complete repository secret-history audit.

## Dependency advisories

`npm audit --json` reported **10 moderate, 0 low, 0 high, 0 critical** findings. The root advisory is minimatch globparts-amplification denial of service, [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), with affected range >=7.0.0 <11.0.1. Installed minimatch 10.2.6 is pulled by @expo/fingerprint 0.21.10 and @typescript-eslint/typescript-estree 8.72.2. Reported affected chains include expo, @expo/fingerprint, eslint-config-expo, eslint-plugin-expo and TypeScript ESLint parser/plugin/type-utils/typescript-estree/utils.

`npm audit fix --dry-run --json` was inspected; it proposed **0 changed packages**, retained the advisories and listed optional dependency additions. The Expo fix offered by the audit is Expo 52.0.49, a breaking downgrade from SDK 58. No forced downgrade, cross-major minimatch override, lockfile update or broad dependency upgrade was applied. A compatible upstream resolution remains pending; this is not a clean audit result.

## Files added

- `backend/apps/accounts/tests_mobile_http.py`: isolated live-server fixture/orchestration, real WSGI handler, random disposable credentials and child test process.
- `mobile/integration/backend.integration.ts`: three real HTTP integration scenarios using existing mobile services.
- `mobile/integration/vitest.config.mjs`: separate integration discovery so `npm test` does not depend on a live fixture environment.
- `docs/PHASE7_INTEGRATION_TEST_REPORT.md`: this report.

No production backend logic, schema/migration, website source, mobile runtime source, branding, package manifest or dependency lock was changed in this phase. Existing workspace changes from prior phases were preserved. Export regenerated ignored mobile/dist artifacts.

## Precise remaining steps

1. In Android Studio Device Manager, create an AVD from an installed compatible system image and boot it, or connect an authorized Android device with USB debugging enabled and accept its debugging prompt. Verify `adb devices` shows a ready device, not unauthorized/offline. Configure a compatible JDK/JAVA_HOME for local native builds; the current PATH lacks Java.
2. Prepare a persistent-for-the-session **disposable** Django test environment using the existing backend, isolated PostgreSQL test storage and temporary media, with safe accounts for all six roles. Do not launch the ordinary development settings against institutional data and seed test users there. The automated runner in this phase is deliberately short-lived and removes its fixture database on completion; its credentials are not reusable manual-test accounts.
3. Set `EXPO_PUBLIC_API_BASE_URL` for that environment. Emulator: host alias `10.0.2.2` and the actual backend port. Physical device: a reachable authorized LAN host/HTTPS endpoint, or a deliberately configured ADB reverse tunnel. Configure matching Django hosts and restricted test firewall access. Keep release HTTPS enforcement. HTTP cleartext policy in the actual native client has not been verified; prefer test HTTPS or explicitly scoped development-client configuration, never a global production exception.
4. From mobile, launch Metro (`npx expo start`) and open on an SDK-compatible Expo client; if required native modules are absent, create/install a development build after the JDK/SDK setup. No development APK or EAS build was produced here.
5. Execute six-role login/restoration/logout and core Faculty upload -> correction -> in-charge -> HOD -> IQAC -> evidence flows on the device, then report generation/merge/handoff/download and actual viewer/sharing. Inspect permissions, offline/expired-auth behavior, private cache cleanup, background/resume, branding/keyboard/safe areas and dashboards. Record device/OS/build/backend identifiers and results without tokens/passwords.
6. Exercise populated accreditation evidence/metric relationships, notification deep navigation and task screens. Review the moderate dependency advisories and pagination warning before release.

**Final decision: PARTIAL.** Automated HTTP/service integration and available regressions pass, but completion criteria requiring Android launch, Android-to-Django connectivity and native core workflows are blocked by runtime availability. Stop after Phase 7.
