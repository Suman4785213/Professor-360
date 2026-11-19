# Phase 7.1 Android runtime validation

Date: 2026-11-15 (Asia/Calcutta). **Final Phase 7 status: PASS for the requested Phase 7.1 emulator integration criteria.** This report supersedes the earlier missing-SDK/approval-pending checkpoint.

## Installation and environment

| Component | Verified location/result |
| --- | --- |
| Existing Android Studio | `H:\android\bin\studio64.exe`, build AI-261.23567.138.2611.15646644 |
| Existing Java | `H:\android\jbr\bin\java.exe`, OpenJDK 21.0.10 |
| Existing SDK | `C:\Users\suman\AppData\Local\Android\Sdk` |
| ADB | SDK `platform-tools\adb.exe`, 1.0.41/package 37.0.1 |
| Emulator | SDK `emulator\emulator.exe`, 37.1.11.0, AEHD operational |
| Approved command-line tools | SDK `cmdline-tools\latest`, revision 23.0 |
| Approved system image | SDK `system-images\android-35\default\x86_64`, API 35 revision 2 |
| QA AVD | `Professor360_QA_API35`, Pixel 5, emulator-5554, 1080x2340; `sys.boot_completed=1` observed |
| Client | Official Expo Go 58.0.5 APK installed; existing SDK 58 project runs natively |

The user approved the two missing SDK components. Google archives were checked against published sizes/checksums (command-line tools SHA-1 `57d04f2d75eb8e8fffc5000a987e5de4b5a63e9d`; image SHA-1 `2d857d170c0d1b827149565da34b3383e5306f7f`). Expo Go was checked against its official release SHA-256. Existing Studio, JDK, emulator and copied Resizable_Experimental AVD/archive were preserved. No H: files were changed. That copied AVD is unregistered and references missing images/another user's paths; a separate QA AVD was created.

Java/SDK environment settings were process-local. Metro uses the installed local Expo CLI on port 8081 and ADB reverse for that port. Ignored `mobile/.env.local` supplies `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8765/api/v1/`; no source IP or production HTTP exception was introduced. Android connects to the Windows host through 10.0.2.2.

`backend/run_android_fixture.py` uses existing Django with a randomly named isolated PostgreSQL test database, temporary media, six disposable accounts, locmem email and real WSGI authorization. It binds loopback port 8765, validates the test connection, stops after two hours or a stop file, and tears down its test database. Credentials are only in its temporary manifest, not this report. Institutional database records and uploads were not used for testing. The first fixture expired during HOD review; a fresh fixture repeated creation/upload/submission and completed the full approval chain. Initial fixture-only department and invalid sample PNG defects were corrected. No application backend permissions changed.

## Actual Android workflow evidence

| Workflow | Observed result |
| --- | --- |
| App launch/branding | PASS: actual native app, logo and institution/login UI; Expo Go loading screen observed. Standalone release splash unverified. |
| Institution search | PASS: searched Disposable and selected Disposable Mobile QA. |
| Faculty, In-charge, HOD, IQAC, Management | PASS: entered disposable credentials through native UI and observed each role dashboard with live API data. |
| Super Admin | PASS: native login, platform dashboard and live disposable institution list; logout returned to institution selection. |
| Session restoration | PASS: force-stop/reopen restored IQAC without credentials; Faculty restoration also exercised. |
| Logout/account switching | PASS: returned to institution selector and subsequent accounts displayed their own role/data. Native private-cache filesystem inspection not performed; automated cleanup tests pass. |
| Activity creation | PASS: Android QA Activity and, after fixture expiry, Android QA Review created through native forms. |
| PDF/image uploads | PASS: Android document picker PDF (431 bytes) and native image picker PNG (197 bytes); attachment responses and progress observed. Second fixture repeated PDF upload. |
| Submission and approval | PASS: DRAFT -> PENDING_INCHARGE -> PENDING_HOD -> PENDING_IQAC -> VERIFIED_EVIDENCE, each decision from the corresponding Android account. Logs/status observed in UI. |
| Authorized attachment download | PASS: authenticated PDF opened Android share sheet. No external recipient was selected. |
| Private profile image | PASS: authenticated image loaded; fallback/error/retry exercised while correcting the disposable PNG fixture. |
| Report generation/download | PASS: IQAC generated FACULTY_PROFILE PDF, COMPLETED, 2843 bytes, one record; authorized download opened native share sheet. See [screenshot](phase7-evidence/android-report-share.png). |
| Notifications | PASS: real HOD approval notification displayed; Mark all read changed unread count 1 -> 0 on revisit. Polling only, no push claim. |
| Tasks | PASS: IQAC created Android QA task, invoked start and complete, observed COMPLETED list status and persisted comment/action history. |
| Navigation/back/keyboard | PASS for exercised screens: Android back returned from task detail and share sheet; forms scrolled, keyboard dismissed, pickers worked. Single emulator size only. |

Actions were performed through ADB input against the native application. Occasional uiautomator timeouts and premature Metro launches were retried after observing current state; these are not counted as application test passes. Host read-only API queries retrieved Android-created record IDs for deep-link navigation. Host HTTP tests are reported separately below.

## Confirmed runtime fixes and files

- `mobile/src/components/dashboard.tsx`: expose native RefreshControl directly. The former wrapper dropped children/style injected by Android ScrollView, producing blank dashboards after successful login.
- `mobile/src/components/ui.tsx`: explicit flex layout for screen ScrollView.
- `mobile/src/constants/roles.ts`: preserve literal role-route types.
- `mobile/src/features/Dashboard.tsx`, `dashboards/SectionView.tsx`, `Notifications.tsx`, `operations/Operations.tsx`: remove incorrect pathname casts uncovered by generated Expo route declarations.
- `mobile/tsconfig.json`: include generated Expo types. Generated ignored `.expo` declarations remain generated artifacts.
- `mobile/tests/native-refresh.test.ts`: regression guard preserving native refresh component identity for Android content injection.
- `backend/run_android_fixture.py`: isolated temporary runtime fixture helper.
- Both Phase 7 reports and `docs/phase7-evidence/android-report-share.png`.

Temporary diagnostic logging was removed. Package versions, website design, production backend logic and schema were not changed in this continuation. Existing unrelated workspace changes were preserved.

## Executed regression checks

| Check | Actual result |
| --- | --- |
| `npm test` | PASS: 68 tests, 9 files, after runtime fix |
| `npm run typecheck` | PASS including generated Expo routes |
| `npm run lint` | PASS, exit 0 |
| `npx expo-doctor` | PASS: 20/20 |
| Local Expo CLI Android export, max-workers 2 | PASS: 1387 modules, 27 assets, 3.9 MB Hermes bundle; export-only HTTPS example.invalid URL |
| `python -B backend/run_security_tests.py apps.accounts.tests_mobile_http` | PASS: one Django harness, 3 real-HTTP scenarios; 26.162 seconds, isolated PostgreSQL database destroyed |
| Full backend suite | Earlier Phase 7 result: 308 passed; not rerun in this continuation because application backend logic was unchanged |
| Website | No website changes in this continuation; web suite/build not rerun |

## Advisories and remaining release validation

Audit reviewed: 10 moderate, zero high/critical. minimatch 10.2.6 globparts-amplification advisory affects Expo fingerprint/TypeScript ESLint dependency chains. Audit fix dry run changed zero packages and offered an incompatible Expo SDK 52 downgrade; no forced fix or lockfile change was applied. See the integration report's advisory section for package details.

This validates Expo Go on API 35, not a signed standalone APK, physical phone, iOS, production TLS endpoint, real email delivery or release splash. Native Excel/Word viewing, report merge/handoff, correction/rejection recovery, expired-token/offline UI and populated accreditation screens were not all repeated on Android; automated service/security coverage is separate. No PDF viewer was installed: binary download/share-sheet invocation was verified, PDF rendering was not. Long generic report/task details and opaque selection IDs are usability limitations, not fabricated data. No critical security/runtime blocker was observed in the exercised core flow.

No deployment or Phase 8 work was performed.

## Cleanup and final decision

The final fixture stopped through its stop file and Django confirmed test-database teardown. An earlier interrupted fixture left an orphan: its exact test database was obtained from its manifest, its test-only name was validated, zero active connections were confirmed, and only that test database was removed. Automatic approval review rejected recursive removal of its temporary media directory with the reason "blocked by policy"; that directory remains at `C:\Users\suman\AppData\Local\Temp\p360_security_android__2y1qjht`. It contains disposable QA data only. The original uploaded files were untouched. Final account logged out; emulator and Metro stopped. Installed SDK components and both AVDs remain available. Ignored mobile/.env.local still points to the stopped disposable endpoint; start the fixture helper before reusing it.

**PASS:** actual Android launch, Django connectivity, six-role login, native upload, full verification chain, report generation/download and required automated checks succeeded. Release-device and advisory limitations above remain explicit; this is not production release approval. Stop after Phase 7.1.
