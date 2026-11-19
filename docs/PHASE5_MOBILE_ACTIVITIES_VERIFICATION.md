# Phase 5 mobile activities, uploads and verification

Date: 2026-11-14. **Final status: PASS for implemented workflows and available automated checks.** Native device and live-backend behavior remain unverified. No Phase 6 work started.

## Implemented screens and components

The existing faculty Activities section and role verification queues now open the protected workflow screen. Faculty can create drafts, open activity details, edit eligible records, save corrections, confirm submission/resubmission, confirm deletion of an owned draft, inspect current status/rejection reason, upload evidence and see verification history. Creation changes the route to the newly returned activity ID rather than submitting verification automatically.

Department In-charge, HOD and IQAC queues retain the existing backend state filters and pagination. Queue cards open the actual verification record; the screen displays activity metadata, files, history and only the appropriate stage actions. Approval and return/rejection require an explicit confirmation. Rejection requires a comment. After an action, activity/verification/dashboard/evidence/notification queries are invalidated on both success and failure. A stale state or permission response is shown as an error and the record refreshes; no local evidence verification shortcut exists.

Reusable implementations: ActivityForm, DocumentPickerField, UploadProgressIndicator, EvidenceAttachmentList, VerificationTimeline, VerificationDecisionSheet, ReturnReasonDisplay and SubmissionConfirmation. Existing RecordCard/VerificationStatusBadge/SectionView supply ActivityCard, StatusBadge and paginated VerificationQueue functionality. These components reuse the existing native theme, safe-area Screen, loading/error states, downloads and six role guards.

## Backend endpoints

All paths below use /api/v1/. Resource URLs returned with the existing /api/ alias are followed through the same protected API client.

| Method | Path | Use |
| --- | --- | --- |
| GET, POST | activities/ | Scoped list and new draft |
| GET, PATCH, DELETE | activities/{id}/ | Details, eligible correction, owned draft deletion |
| POST | activities/{id}/submit/ | Submit/resubmit, no client-set status |
| GET | activity-categories/ | Actual permitted category catalog, all pages |
| GET | academic-years/ | Actual academic years, all pages |
| POST | documents/ | Authenticated native multipart upload |
| GET | documents/{id}/download/ and returned download_url | Existing private preview/open/save transport |
| GET | verifications/ | Role queues, existing current_status/current_status__in filters |
| GET | verifications/{id}/ | Activity details and verification logs |
| POST | verifications/{id}/incharge-verify/ | In-charge APPROVE/REJECT |
| POST | verifications/{id}/hod-verify/ | HOD APPROVE/REJECT |
| POST | verifications/{id}/iqac-verify/ | IQAC APPROVE/REJECT and target |

Draft fields follow ActivitySerializer: title, activity_type, organizer, venue, location, start_date/end_date, duration/days/hours, description, additional_remarks, is_online, certificate_number, category and academic_year. College, faculty, department and workflow status are never set by the mobile form. Empty optional date/relationship/numeric fields are normalized to null. Backend field-validation details are shown; server remains authoritative.

Activity type choices match source: FDP, WORKSHOP, SEMINAR, CONFERENCE, CERTIFICATION, PUBLICATION, RESEARCH, TRAINING, ACHIEVEMENT, AWARD, OTHER. Category records/UUIDs are fetched rather than seeded or invented. The optional academic year follows the backend's current-year default on new draft creation.

## Upload contract and safety

Expo DocumentPicker (copyToCacheDirectory) supports PDF/JPG/JPEG/PNG documents. Expo ImagePicker opens the image library; no camera/audio feature is added and unnecessary camera/microphone permissions are disabled in app configuration. Cancellation exits the picker without an upload. Size metadata falls back to Expo FileSystem. The client checks extension, MIME and a positive known size up to **10 MiB**. Django signature/security validation remains authoritative; the mobile client does not claim signature validation.

FormData fields: activity, file_name, document_type (CERTIFICATE/SUPPORTING/OTHER) and file {uri,name,type}. Filename path/control characters are replaced. Authentication uses existing bearer injection and refresh. The HTTP client supplies the multipart boundary; no boundary is hardcoded. Progress displays transferred percentage when a total is supplied, otherwise an in-progress message. An AbortController supports cancellation and aborts on component unmount. After failure or cancellation, metadata is refreshed before manual retry; cancellation cannot undo a request already committed by the server.

Uploaded documents show original/file name, byte count and MIME, with existing authorized native open/save controls. Private URLs and tokens are not displayed. No direct database or raw bucket access. No automatic network/5xx mutation retry. Existing 401 refresh/replay is retained. Uploads use the existing 15-second client timeout, so slow transfers may require a later timeout policy revision. Picker-copy cache retention follows the OS; the app does not delete original user-selected source files.

## State machine and permissions

Normal: DRAFT -> PENDING_INCHARGE -> PENDING_HOD -> PENDING_IQAC -> VERIFIED_EVIDENCE.

In-charge rejection -> RETURNED_TO_FACULTY. HOD rejection -> RETURNED_TO_INCHARGE; in-charge can approve/return this state. IQAC targets preserve actual backend semantics: FACULTY -> RETURNED_TO_FACULTY, HOD -> RETURNED_TO_INCHARGE, DEPARTMENT_INCHARGE/default -> REJECTED_IQAC. The UI labels the outcomes and sends the existing target values. Legacy INCHARGE_VERIFIED, HOD_APPROVED, IQAC_VERIFIED and REJECTED_INCHARGE/REJECTED_HOD states are displayed as returned by Django; no invented transitions are applied.

| Role | Mutations in this mobile phase |
| --- | --- |
| Faculty | Own editable activity save/upload/submit; delete own DRAFT only |
| In-charge | Own college/department pending or returned-in-charge decisions |
| HOD | Own college/department pending HOD decisions |
| IQAC | Own college pending IQAC decisions |
| Management | Authorized scoped reads; no faculty or stage impersonation |
| Super Admin | Authorized scoped reads; no implicit verification-stage bypass |

Faculty editability uses server is_editable plus ownership/college/department checks. Django additionally enforces all permissions. No backend permissions were changed. Existing PostgreSQL locks reject duplicate/conflicting transitions. In-flight service requests are shared per action to prevent accidental repeated taps, and UI disables active actions. Draft creation/upload has no durable backend idempotency key; ambiguous network outcomes require reviewing refreshed lists/files before intentional retries. This is not a claim of exactly-once creation after process termination.

## Tests executed

- npm test: **53 passed**, 7 files, zero failed. Includes all prior mobile tests and 13 new tests for draft creation/patch payloads, ownership/tenant/locked-state denial, draft-only deletion, duplicate submission and returned resubmission, in-charge pending and returned decisions, HOD decisions, IQAC final decisions, required reasons, stale/403 failures with refresh, file size/type limits, native multipart metadata, pre-cancelled uploads and failed upload refresh/no automatic retry.
- npm run typecheck: passed, exit 0.
- npm run lint: passed, exit 0, no warnings/errors after replacing React Hook Form watch with useWatch.
- npx expo-doctor: **20/20 passed**, exit 0.
- Android Hermes bundle export: passed, exit 0, 1378 modules, 27 assets, 3.8 MB bundle, using a synthetic HTTPS API origin solely for export. This is not an APK build or live API request.
- adb devices: no connected device. emulator -list-avds: no configured AVD. No device picker, multipart upload, live faculty/verification login or native review flow was performed. Set up an emulator or authorized device with a disposable isolated backend account before native validation.

Tests use synthetic identities and mocked API/native boundaries. They do not establish native picker rendering, transfer progress fidelity, OS cancellation behavior or real Django tenant authorization from a device. Existing backend tests already cover backend authorization/concurrency, but were not rerun here because backend source is unchanged. Website tests/build likewise were not rerun because website source/dependencies were unaffected; prior passing results remain historical.

## Files created or modified

New mobile/src/features/activities/api.ts, ActivityForm.tsx, Upload.tsx, Workflow.tsx; new mobile/tests/activities.test.ts; new workflow.tsx re-export route in each existing role directory. Updated mobile/src/features/dashboards/SectionView.tsx to connect Create/Open/Review navigation. Updated mobile/package.json, package-lock.json and app.json for Expo-compatible pickers. This report is new. Existing website/backend/records/uploads/branding remain unchanged; no migrations, seeds or deployment.

## Limitations and later work

Live device/end-to-end validation, screen accessibility/keyboard review, actual permission-prompt behavior and binary/signature cases require an authorized test environment. Existing moderate SDK/tooling dependency advisories remain. Dates have client format/order checks; server validates calendar values. Generic forms expose the backend academic model rather than introducing unsupported type-specific publication fields. Supporting document previews use the native open/save/share implementation, with viewer availability dependent on installed apps.

Future Phase 6 scope must be authorized separately. Possible follow-ups include device validation, richer date/category pickers, durable draft/upload recovery, and later report/task workflows; none were started automatically. Phase 5 PASS covers completed requested application workflows and available automated checks, with device/live-backend validation explicitly pending.
