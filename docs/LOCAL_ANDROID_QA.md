# Local-only Android QA build

Authorized target: http://10.21.101.252:8000/api/v1/ on the existing laptop. This is local testing only, not a production deployment. No backend/database changes are required or performed.

## Configuration

Use mobile/scripts/build-android-release.ps1 -Profile local-qa with the existing SDK/JDK and private QA signing environment variables. The script sets the authorized URL, disables offline QA mode and dotenv loading, and generates a timestamped professor360-local-qa APK. App ID is com.professor360.mobile.localqa; launcher label is Professor360 LOCAL QA. It can coexist with the previous QA/production packages and has independent app data.

The Expo config plugin writes a network-security-config with cleartext denied by default and a single domain exception for 10.21.101.252, without subdomains. Android network policy scopes by host, not port/path; the build and runtime policy additionally require the exact authorized URL, port 8000 and /api/v1/ path. HTTPS certificate validation remains unchanged. All production and ordinary QA profiles omit the HTTP exception and local runtime authorization; production without an HTTPS endpoint fails configuration validation. Existing explicit offline QA remains separate.

Existing role dashboards, authenticated file flows, JWT/SecureStore and tenant controls are unchanged. The local APK uses HTTP on the trusted local network only; do not distribute it as a production build or use it over an untrusted network. Rebuild if the laptop IP changes. Never expose the laptop backend publicly for this task.

## Validation

82 mobile tests passed across 12 files; TypeScript and ESLint passed. Five new cases cover local package/config isolation, ordinary QA/production HTTPS requirements and missing endpoint rejection, runtime exact-URL checks, and the narrow Android network policy. Existing runtime tests mock expo-constants alongside SecureStore; the initial missing mock was corrected before the passing run.

Read-only laptop HTTP probe returned 401 AUTHENTICATION_REQUIRED, confirming API reachability without credentials. This is not successful authentication. No PostgreSQL records were changed, reset or seeded. No dependencies upgraded. Existing QA signing key and SDK/NDK/CMake/Java 17 were reused. Existing CMAKE_OBJECT_PATH_MAX=240 retained. Windows PowerShell stderr handling was corrected to allow Expo warnings while preserving nonzero exit-code failure checks.

Expo documentation fetch returned HTTP 403; existing installed config-plugin APIs were inspected. Android host policy follows https://developer.android.com/privacy-and-security/security-config. Android APK build/verification result will be appended below. No authorized ADB device was connected at the initial check; device installation/login testing is pending unless separately recorded below.

## Completed artifact verification

Build completed successfully: **BUILD SUCCESSFUL in 17m 44s**, 566 actionable tasks (538 executed, 28 up-to-date). On resumption the existing APK was verified without rebuilding or repeating the already-passing tests.

- APK: `F:\IQAC\mobile\release-artifacts\professor360-local-qa-20261116-105752.apk`
- Size: **93,665,772 bytes**.
- SHA-256: `E650D154B763A4BCF17A60F1478D50FEC6F0772E23CA6E13AB4AC67E7534B217`
- Signing: **VERIFIED**, APK Signature Scheme v2, existing Professor360 QA RSA-3072 certificate. Preserved artifact hash matches Gradle output.
- Package: `com.professor360.mobile.localqa`, label `Professor360 LOCAL QA`, version 1.0.0 (1), min SDK 24 / target 36. No debuggable flag.
- Actual APK manifest: backups disabled, usesCleartextTraffic=false, explicit network-security-config. Packaged resource xml/p360_network_security is optimized to res/H9.xml: base cleartext denied, only 10.21.101.252 allowed, no subdomains.
- APK bundle and embedded Expo configuration contain the exact authorized local API. Existing offline QA APK remains preserved. Production HTTPS-only configuration is unchanged by artifact verification.
- Device: **DEVICE NOT CONNECTED**. Installation and login-screen/runtime connection checks skipped. Signature/package validation passed, but actual device installation, authentication and workflows are **NOT TESTED**. The prior HTTP 401 probe establishes unauthenticated laptop reachability only.
