# Phase 8 Android release build and validation

Execution dates: 2026-11-15 to 2026-11-16, Asia/Calcutta. **Final status: PARTIAL. Signed offline QA APK generated; physical-device and live-backend validation unavailable.**

## Scope and authorization

The user confirmed that no authorized HTTPS backend exists and requested an APK if possible, without inventing an endpoint or exposing the backend. The user approved installation of the missing Android platform, NDK and matching CMake into the existing SDK. No external build service, credential upload, deployment or publishing is authorized or performed.

## Environment

- Existing Studio: `H:\android\bin\studio64.exe`; reused JDK: `H:\android\jbr`, Java 21.0.10.
- SDK: `C:\Users\suman\AppData\Local\Android\Sdk`; existing build-tools 37.0.0, command-line tools 23.0, ADB 37.0.1.
- Expo 58.0.25, React Native 0.88.1, React 19.3.0; generated Gradle wrapper 9.4.1.
- Installed native version catalog requests compile SDK 37, target SDK 36, min SDK 24, NDK 27.1.12297006 and Android Gradle Plugin 9.2.1.
- Google's repository names the required platform `platforms;android-37.0`, rather than `platforms;android-37`. NDK archive is `android-ndk-r27b-windows.zip`; CMake is 3.22.1.
- No physical device is connected (`adb devices -l` returned an empty list).

## Configuration changes

`mobile/app.config.js` consumes the existing app.json and preserves name, artwork, splash and screens. Production retains `com.professor360.mobile`; QA uses `com.professor360.mobile.qa` to separate installations. Backup is disabled and SYSTEM_ALERT_WINDOW removed. Camera/microphone remain blocked by the existing picker config; legacy storage permissions remain restricted to API 32 and below. The merged release manifest and actual APK badging were inspected: QA package, min SDK 24 / target 36, backup disabled, no debuggable flag, no camera/microphone/overlay permission. Biometric/fingerprint permissions come from secure storage; the exported AndroidX profile installer is protected by android.permission.DUMP.

`P360_BUILD_PROFILE=production` requires an HTTPS `/api/v1/` endpoint with no credentials/query/fragment and rejects localhost, emulator aliases and .invalid. Explicit offline QA permits no endpoint and displays a branded configuration-required screen. Its public/authenticated HTTP clients reject requests before dispatch. Existing feature code is preserved but intentionally inaccessible in that offline artifact. An online QA/production APK must be rebuilt after the authorized endpoint is supplied. No fabricated server URL is embedded. The ignored emulator .env.local is preserved and excluded from release building using EXPO_NO_DOTENV=1.

`mobile/plugins/withReleaseSigning.js` replaces the template's release debug signing with an environment-provided private signing configuration. `mobile/scripts/build-android-release.ps1` validates configuration, generates native files with Expo, restores package scripts changed by prebuild, invokes assembleRelease and then verifies the APK with apksigner and calculates SHA-256. Generated Android files remain ignored. Keystores, credentials.json and release artifacts are ignored.

A new QA-only RSA 3072-bit PKCS12 key was generated outside the workspace under the current user's LocalAppData/Professor360/qa-signing directory, without overwriting a key. Its directory ACL is restricted to the current Windows user. Its password is stored encrypted using Windows DPAPI for that user, and supplied to keytool/Gradle by environment variables. This is not an institution's production signing identity. No private key or password is recorded here or committed. APK signing is VERIFIED with build-tools 37 apksigner: one RSA-3072 QA signer, APK Signature Scheme v2. Certificate SHA-256: `bc2a3acf730022f572f5c4ffdbba724a87806f2ab8abc4d7d183ac82e5a16371`. This does not establish production signing ownership.

## Build progress

Expo prebuild succeeded. A Windows EBUSY directory lock on a later regeneration was resolved by ending the prior Gradle process and rerunning. An offline Gradle probe failed because Kotlin 2.2.0 plugin artifacts were not cached. Approved SDK downloads and installation are complete; native release compilation subsequently completed successfully. Official archive sizes/checksums are verified before installation; partial download presence is not treated as an installed SDK.

### Verified artifact

- Build: `:app:assembleRelease`, **BUILD SUCCESSFUL in 22m 36s**, 566 actionable tasks (538 executed, 28 up-to-date).
- Path: `F:\IQAC\mobile\release-artifacts\professor360-qa-offline-20261116-091623.apk`
- Size: **93,664,628 bytes** (89.33 MiB).
- SHA-256: `8E4F23F2613490EE7F901C223969290A9F9A9FF50C1AAA439968716893B1BCE0`
- Signing: **VERIFIED**, v2, QA identity (not Android debug key).
- Package: `com.professor360.mobile.qa`, version 1.0.0 (1); ARM64, ARMv7, x86, x86_64.
- Preserved artifact hash matches the Gradle output. APK contains the offline configuration screen and no previous emulator API addresses (ports 8000 or 8765).
- No install/launch test was performed against this APK: ADB has no connected device. Previous Expo Go emulator tests are not release APK validation.

The first native build failed on Ninja's 260-character Windows object-path limit. Its CMake cache used 1024. The Expo signing/build plugin now appends `-DCMAKE_OBJECT_PATH_MAX=240`; all four generated caches confirmed 240 and the subsequent build succeeded. No application/dependency feature was removed. CMake's installed help documents deterministic hashing above this threshold. The native-only correction does not invalidate the already completed JS/HTTP checks.

The verified API 37.0 platform, CMake 3.22.1 and NDK 27.1.12297006 archives were installed. Maven eventually resolved the Kotlin plugin. React Native's included Gradle projects then requested `jvmToolchain(17)`; no existing Java 17 was found in the checked Java/Adoptium locations. Gradle began an automatic Temurin download, which was stopped pending explicit approval because the previous approval covered SDK/NDK/CMake. The user subsequently approved the Java 17 toolchain. Foojay and Adoptium API endpoints returned HTTP 403, so the matching official Adoptium GitHub release was downloaded resumably and verified against its published SHA-256 `98518ecf554465057ee5509462631deeee374bc368c12a411d225cd29381f84b`. Temurin 17.0.21+9 is installed in `C:\Users\suman\.gradle\jdks\professor360-temurin17`; `java -version` succeeds. NDK clang 18.0.2 also executes successfully. The build script accepts that path through P360_JAVA17_HOME and disables automatic JDK installation unless `-AllowToolchainDownload` is explicitly supplied. The existing Java 21 installation remains unchanged. Release prebuild now explicitly sets EX_DEV_CLIENT_NETWORK_INSPECTOR=false. The archive installs initially lacked package.xml registration, causing Gradle to attempt another platform download. The attempt was stopped; local package metadata was populated from the exact Google repository entries for the verified installed versions. Gradle then recognized the SDK/NDK and evaluated all projects successfully.

## Regression evidence

Latest completed checks on 2026-11-16 after the final release configuration changes (before the native-only CMake path correction; successful APK compilation subsequently validates that correction):

| Check | Result |
| --- | --- |
| Mobile tests | 77 passed, 11 files (Phase 7.1 baseline: 68) |
| TypeScript | PASS |
| ESLint | PASS; final rerun after native-only plugin correction also exit 0 |
| Expo Doctor | PASS 20/20; initial dynamic-config detection warning corrected |
| Offline QA Android production export | PASS: 1387 modules, 27 assets, 3.9 MB Hermes bundle |
| Backend HTTP harness | PASS: one Django test, three real HTTP scenarios, 25.549 seconds; isolated PostgreSQL database destroyed |
| Website | Unchanged in this phase; web tests/build not rerun |

New tests cover offline QA/production separation, unsafe endpoint rejection, package/backup/permission settings and network dispatch rejection without a configured endpoint. Six-role live behavior remains the historical Phase 7.1 emulator evidence, not a release-APK test result.

## Dependency security review

Fresh npm audit reports 10 moderate, zero high/critical. These are ten affected package entries deriving from one minimatch advisory, GHSA-g3hv-75wg-m249, not ten independent vulnerabilities.

| Affected package | Path and exposure |
| --- | --- |
| minimatch 10.2.6 | Globparts amplification; malicious patterns can consume build/lint resources |
| @expo/fingerprint | Node build fingerprint tooling calling minimatch |
| expo | Audit propagation from fingerprint; the audit entry alone does not establish runtime exploitability |
| @typescript-eslint/typescript-estree | Development parser/tooling using minimatch |
| @typescript-eslint/parser | Development ESLint parser, transitive exposure |
| @typescript-eslint/type-utils | Development analysis, transitive exposure |
| @typescript-eslint/utils | Development ESLint utilities, transitive exposure |
| @typescript-eslint/eslint-plugin | Development lint rules, transitive exposure |
| eslint-plugin-expo | Development lint tooling, transitive exposure |
| eslint-config-expo | Development configuration, transitive exposure |

No mobile app source imports minimatch/fingerprint/ESLint. Treat untrusted build inputs/glob patterns as the relevant resource-exhaustion risk; there is no demonstrated JWT/data-exfiltration exploit from this advisory. Audit dry run retains all ten findings and offers Expo 52.0.49 as a breaking downgrade from SDK 58. No force fix, cross-major override or unnecessary dependency upgrade was applied. Findings remain unresolved, not waived.

## Physical-device validation

**NOT TESTED — DEVICE UNAVAILABLE.** Live API validation is independently blocked by the absent authorized HTTPS endpoint. For the preserved signed APK:

1. Connect an authorized QA phone, enable USB debugging and accept its prompt. Verify `adb devices -l` shows `device`, not unauthorized.
2. Independently run build-tools/37.0.0/apksigner verify --verbose --print-certs against the delivered APK and compare its SHA-256 with this report.
3. Install with `adb -s DEVICE_SERIAL install -r FULL_APK_PATH`. Do not uninstall an existing institutional app to bypass a signing mismatch. QA uses a separate package.
4. Launch without Metro and inspect splash, crash logs, system back, keyboard, picker and sharing. The offline QA APK should show the endpoint-required screen and send no API requests.
5. After rebuilding with an authorized HTTPS QA endpoint and isolated accounts, validate all six logins/dashboards; activity creation, PDF/image upload, submission, In-charge/HOD/IQAC approval; report generation/download; notifications/read counts; task status/comments; force-stop restoration; logout; and network failure handling. Record per-feature results on the physical device.

## Cleanup and preserved data

Read-only inspection of `C:\Users\suman\AppData\Local\Temp\p360_security_android__2y1qjht` found its fixture manifest, generated 431-byte PDF/197-byte PNG, disposable avatar/evidence and 2843-byte QA report. Phase 7 recorded removal of its isolated database. The prior automatic deletion restriction remains respected: the folder is untouched, and no alternative deletion mechanism was attempted. It is not the application's institutional MEDIA_ROOT.

No institutional database, uploaded document, website design or production credentials were modified. No deployment or publishing was performed. The later consolidated instruction authorizes readiness documentation for Phases 9 and 10.

## Final decision and remaining limitations

**Phase 8: PARTIAL. Release readiness: NOT READY.** APK generation and signing passed. Physical-device launch, six-role release workflows, uploads/downloads, session restoration and logout remain NOT TESTED because no authorized phone or HTTPS API is available. The offline artifact intentionally disables live workflows; rebuilding with the authorized endpoint is required. Ten moderate npm advisory entries remain as detailed above. Prebuild warns that expo-system-ui is absent, so native forced-light appearance is not verified; branding files were preserved. The prior QA media folder remains untouched under its existing deletion restriction.

Files changed in this phase: mobile/app.config.js, mobile/plugins/withReleaseSigning.js, mobile/scripts/build-android-release.ps1, mobile/.gitignore, mobile/src/services/runtime.ts, mobile/src/services/client.ts, mobile/app/_layout.tsx, mobile/tests/release-config.test.ts, mobile/tests/offline-qa.test.ts, and this report. Generated native files/artifacts are ignored. Existing earlier-phase website/backend changes in Git were preserved, not attributed to Phase 8.
