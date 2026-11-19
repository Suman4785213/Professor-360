# Professor360 Mobile

Native Expo Router / TypeScript foundation using the existing Django API. No WebView, second backend, or database connection. Phase 4 adds role-specific API-backed dashboard summaries and paginated read views; see ../docs/PHASE4_MOBILE_DASHBOARDS.md for remaining actions and runtime limitations.

## Start

Run npx --yes npm@11 ci (npm 10 hit an internal dependency-tree error here), copy .env.example to .env, configure EXPO_PUBLIC_API_BASE_URL, then npm start from mobile/. Match the Expo Go/development-client SDK to package.json (SDK 58). Node 22.18 was used for validation. The SDK/template choice follows https://docs.expo.dev/get-started/create-a-project/; native dependencies are selected with expo install and recorded in package-lock.json.

## API addresses

EXPO_PUBLIC_API_BASE_URL must end with /api/v1/:

- Android emulator: http://10.0.2.2:8000/api/v1/
- Physical Android: http://<development-PC-LAN-IP>:8000/api/v1/ on the same trusted network. Never use localhost or 10.0.2.2 for a physical phone. Configure Django ALLOWED_HOSTS for the LAN address and firewall only for the test network. Use disposable test accounts/data; do not expose development settings publicly.
- Production: https://<API-host>/api/v1/. Release code rejects non-HTTPS URLs.

Expo's Metro tunnel does not tunnel Django. Public Expo variables are bundled into the app: never put credentials or secrets in them. This phase does not start a backend or alter database settings.

Install Android Studio/JDK and configure an Android Virtual Device to use npm run android. Alternatively connect an authorized Android device and verify adb devices. Use a compatible Expo Go client or a development build. Local APK builds require a compatible JDK and SDK; npm run android launches Metro/Expo, not an APK build. iOS local builds require macOS/Xcode. No EAS cloud build or publishing is automatic.

## Structure

app/: institution search, role login, root restore and six protected role route directories.
src/components/: native Screen, Card, Button, Input, loading/error and brand.
src/features/: shared dashboard/profile/notification screens and role guard.
src/services/: Axios session client, error normalization, SecureStore/API runtime.
src/store/: Zustand user/institution state; tokens never persisted by Zustand.
src/hooks/: debounced institution search.
src/constants/: exact backend roles, labels and routes.
src/types/: Zod user validation and API models.
src/theme/ and src/assets/: light palette and unchanged official logo copied from frontend.
tests/: focused unit tests.

## Authentication and screens

Institution search uses GET colleges/public/?q=. Selection stays in memory for login; Super Admin uses a separate entry. Five institution role choices are checked against the server-returned user.role and college; role choice is not authorization. Login uses auth/login/, restore uses auth/me/, logout submits the refresh token to auth/logout/ and clears local state even if the network call fails.

SecureStore holds both tokens in one JSON item. Axios attaches bearer headers only to the configured origin. Refresh is coordinated across concurrent 401 responses, persists both rotated tokens, and retries once. An epoch prevents stale requests/refresh from restoring a signed-out or replaced session. Serialized SecureStore writes prevent logout/persistence races. Clearing a session cancels and clears TanStack Query caches. Query and mutation retries are disabled by default; only an authentication 401 may trigger one refresh/replay.

Protected role layouts redirect wrong-role deep links. Dashboard headers show actual user/college and API unread counts; profile uses restored server user data. Notifications show the first API page and support marking read. No fabricated statistics or activity/report workflow implementations. System typography respects native font scaling. Dashboard count polling pauses when the app is backgrounded through Query focusManager.

The mobile foundation currently targets native platforms. SecureStore is not replaced with insecure web token storage. Private resource URL resolution is ready, but file previews/uploads are future features. Push delivery is not implemented.

## Checks

npm run typecheck
npm run lint
npm test
npx expo install --check
npx expo-doctor
npx expo config --type public
npx expo export --platform android

See ../docs/PHASE3_MOBILE_FOUNDATION.md for actual executed outcomes and runtime limitations. A Metro Android export is not an APK or emulator test.


Validation completed in this workspace: 19 unit/source tests pass; Expo Doctor 20/20; SDK dependency compatibility and public config checks pass; Android Hermes export succeeded. TypeScript, ESLint (zero issues), and the final Android export pass. See the phase report for dependency audit findings and unavailable device tests. The existing website retained 12 passing tests and a successful build. Native SecureStore and real API login have not been exercised on a device.

For an export-only check use an explicit HTTPS test configuration (for example https://example.invalid/api/v1/); it is not a usable backend and must not be shipped. For a real release set your actual HTTPS API origin. Native modules/splash configuration require rebuilding a development/release client when changed.
