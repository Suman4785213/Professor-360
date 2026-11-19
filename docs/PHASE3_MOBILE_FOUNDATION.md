# Phase 3: Professor360 mobile foundation

Date: 2026-11-14. **Final status: PASS for the implemented mobile foundation and available automated validation.** Native device runtime and live API verification remain pending, as detailed below.

## Delivered application

Created a standalone native Expo/React Native project inside mobile/. The website and Django source are unchanged by this phase; existing PostgreSQL records and uploads were not accessed or modified. No second backend/database, WebView application, payment changes, deployment or Phase 4 implementation.

- Branded native splash configuration and loading screen using the exact existing Professor360 PNG. Light indigo/slate theme, native system typography and font scaling, buttons/inputs/cards/error/loading primitives.
- Public institution search with debounce, loading/error/empty states and institution selection. Search calls GET /api/v1/colleges/public/?q=. No public institution registration.
- Five institutional role choices plus a separate Super Admin entry. React Hook Form and Zod validate login fields; authenticated role and college are checked against the backend response, never inferred from the UI.
- Six protected route directories: super-admin, management, iqac, hod, incharge, faculty. Each contains a role-checked layout, dashboard, profile and notifications screen. Anonymous/wrong-role navigation redirects. Dashboard shows actual server user/college data, unread count, profile and notifications entries, sign-out and a clear statement that later domain tools are not implemented.
- Profile displays the restored /auth/me/ response. Notifications display the first paginated list and allow explicit mark-as-read; no fabricated records or metrics.

## Structure

mobile/app/ contains root initialization, institution/login screens and six role route directories. mobile/src/components provides native UI primitives; features contains shared screens and auth guards; services contains Axios/session/SecureStore integration; store contains Zustand identity and college selection; hooks contains debounced search; constants contains exact role identifiers/routes; types contains domain models and runtime user validation; theme and assets contain approved branding. tests contains focused tests. package-lock.json pins resolved dependencies. README.md and .env.example contain startup/connectivity instructions.

The user-requested app/ layout is used rather than the generated AGENTS.md preference for src/app/. Both are Expo Router layouts; the explicit user requirement takes precedence.

## Authentication and API implementation

Access/refresh tokens are persisted together in Expo SecureStore, never AsyncStorage or Zustand persistence. Secure persistence must succeed before accepting the pair. Concurrent 401s share one refresh; both rotated tokens are saved and each original request retries at most once. A session epoch rejects stale requests, login results and refresh results after logout/account changes. Serialized writes prevent a pending persistence operation from undoing logout. Repeated 401 rejection clears the session.

Restoration reads SecureStore and verifies identity with GET auth/me/. Offline restoration exposes a retry/error state, not a guessed authenticated role. Logout clears identity/college and cancels/clears all TanStack Query data before a best-effort authenticated blacklist call. Network logout cannot promise server revocation; existing access-token lifetime still applies. SecureStore persistence/deletion can fail at the OS layer; real device behavior remains to be verified.

All app calls use the configured /api/v1/ base. Absolute and root-relative resource URLs resolve against the API origin, and foreign origins/embedded credentials are rejected before bearer injection. Query and mutation automatic retries are disabled; only a 401 can cause one coordinated refresh/replay. Timeouts are 15 seconds. Known structured and legacy error formats are normalized. The client never connects to PostgreSQL.

EXPO_PUBLIC_API_BASE_URL is public configuration, not a secret. Android emulator default: http://10.0.2.2:8000/api/v1/. Physical device: the development PC LAN IP, never localhost or 10.0.2.2. Release runtime requires HTTPS. No live API calls or institutional logins were used for validation; API tests use Axios adapters and disposable synthetic identities. The Android export used https://example.invalid/api/v1/ solely as a build-time configuration, with no network call to that address.

## Installed dependencies

SDK 58 was selected by the current official template and checked against [Expo SDK 58 documentation](https://docs.expo.dev/versions/v58.0.0/). [SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/) and [Router Stack](https://docs.expo.dev/versions/v58.0.0/sdk/router/stack/) APIs were checked against that SDK. Splash appearance requires a release-device check, as described in [Expo splash documentation](https://docs.expo.dev/versions/v58.0.0/sdk/splash-screen/).

| Package | Resolved version |
| --- | --- |
| @hookform/resolvers | 5.9.2 |
| @tanstack/react-query | 5.107.1 |
| axios | 1.21.1 |
| expo | 58.0.25 |
| expo-constants | 58.0.16 |
| expo-linking | 58.0.17 |
| expo-router | 58.0.31 |
| expo-secure-store | 58.0.3 |
| expo-splash-screen | 58.0.14 |
| expo-status-bar | 58.0.5 |
| react | 19.3.0 |
| react-dom | 19.3.0 |
| react-hook-form | 7.92.0 |
| react-native | 0.88.1 |
| react-native-safe-area-context | 5.11.1 |
| react-native-screens | 4.30.1 |
| zod | 4.6.7 |
| zustand | 5.1.0 |
| @types/react | 19.3.0 |
| axios-mock-adapter | 2.1.0 |
| eslint | 9.39.5 |
| eslint-config-expo | 58.0.4 |
| typescript | 6.0.3 |
| vitest | 4.1.12 |

The initial npm 10 install encountered a React/React DOM peer mismatch and an internal edgesOut error. React DOM is pinned to React 19.3.0; npm 11 regenerated the lockfile and completed a clean ci install without --force or --legacy-peer-deps. npm 11 was invoked through npx; the global npm installation was not changed. Native package versions pass expo install --check.

## Verification

| Check | Actual result |
| --- | --- |
| npx --yes npm@11 ci | Passed; clean dependency installation |
| npm test | 19 passed across 3 files; zero failed |
| npm run typecheck | Passed, exit 0, no TypeScript errors |
| npm run lint | Passed, exit 0, no errors or warnings |
| npx expo install --check | Passed: dependencies up to date |
| npx expo-doctor | Passed: 20/20 checks |
| npx expo config --type public | Passed; SDK, plugins, app identifiers and official logo resolve |
| npx expo export --platform android --max-workers 2 | Final export passed, exit 0: 1321 modules, 27 assets, 3.7 MB Hermes bundle in mobile/dist |
| Existing frontend node --test tests/*.test.mjs | 12 passed, zero failed |
| Existing frontend npm run build | TypeScript and Vite passed; existing bundle-size warning |

Tests cover token persistence, concurrent refresh rotation, revoked refresh cleanup, pending refresh/logout, stale session commits, no retry on unsafe server errors, same-origin URL handling, all 36 role combinations and anonymous denial, institution selection, structured/legacy/network errors, backend role/institution validation, cache clearing, Super Admin payload, session restoration and logout/restoration races. An AST regression check rejects raw string children outside native Text/Title components. These are unit/source checks, not native end-to-end tests. Initial lint import warnings and the text-test Node type scope were fixed; only final outcomes should be treated as completion evidence.

## Android and deployment status

The local Android SDK exists under LOCALAPPDATA/Android/Sdk. adb devices returned no connected devices. emulator -list-avds returned no configured AVD. Java was not available on PATH. No emulator boot, APK build, APK install, physical-device login or iOS runtime test was performed. Metro/Hermes export checks JS/assets bundling only. Complete runtime validation by configuring a compatible JDK and AVD or connecting an authorized test device, then launching a compatible Expo Go/development client and using disposable backend accounts.

No EAS cloud build, signing, publishing or credentials were requested or used. Splash/keyboard/accessibility/deep-link visual behavior and SecureStore native persistence remain device checks. No backend regression rerun was necessary because backend source was not changed in this phase; the previous 307 backend test result is historical, not re-executed here.

## Remaining issues

- Native runtime and live Django authentication/connectivity are unverified; no claims of successful APK/device use.
- Notification screen intentionally shows the first page. Full activity, file upload/preview, verification, report and task mobile workflows remain later-phase work. No FCM/APNs push implementation.
- npm audit returned 10 moderate advisories in minimatch and transitive Expo fingerprint/TypeScript ESLint chains, no high/critical findings. The Expo branch's offered automatic fix is an SDK downgrade, so no forced fix was applied. Review compatible upstream patches before release; npm also labels ESLint 9 deprecated. This is not a clean security-audit claim.
- Mobile web authentication is unsupported because SecureStore is native; no insecure browser fallback was added.
- The chosen reverse-domain app identifiers are local foundation defaults and should be confirmed before distribution/signing.

Stop after Phase 3. No Phase 4 work was started.

## Final conclusion

The requested application code, six-role navigation and authentication foundation are implemented. All available required automated checks completed successfully. PASS applies to this foundation phase, not production approval or proof of live device integration. The exact remaining runtime action is to configure a JDK/AVD or connect a test device and validate login, restoration, role redirects, logout, SecureStore and branded splash against an isolated test backend. Dependencies and remaining advisories require review before distribution.
