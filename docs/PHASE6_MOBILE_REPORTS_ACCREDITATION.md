# Phase 6: mobile reports, accreditation, notifications and tasks

Date: 2026-11-14. Status: **PASS for implemented native workflows and available automated validation**, with native-device/live-backend checks explicitly pending. This is not a deployed-environment or release approval. No Phase 7 implementation started.

## Delivered workflows by role

Faculty: existing notification center now supports report-request detail/body and Okay/Done/No responses. Reporting period is displayed in the request text; the backend request contract has no dedicated structured reporting-period field. Reports workspace provides authorized report types/templates, optional academic year/date/criterion/metric filters, preview, server generation, returned generation status/error information, history/detail and native open/save/share. Files are not generated on the phone.

Department In-charge: select an authorized faculty user, send a request message/reporting period, inspect request/response history, generate a faculty report, open the existing Phase 4.1 merge workflow, view stored/merged report metadata/downloads and submit completed reports to HOD. Existing backend merge service and handoff idempotency are reused.

HOD: received-report list, report detail/metadata and authorized downloads; explicit hod-download acknowledgement and submit-to-admins actions. The received/stored list supplies existing handoff flags/history; generic report detail serializers do not expose every handoff timestamp. Repeated handoffs use the protected backend contract and display returned results/errors.

IQAC/Management: scoped report history/inbox, department and academic-year selectors, loaded-page title/status filtering, report detail/download, catalog-based preview/generation and accreditation navigation. Query selectors are sourced from existing APIs. No payment/subscription logic changed.

Super Admin: existing protected platform role can open authorized report/task reads and report-generation actions; accreditation requires an institution context rather than silently choosing a college. No institutional role is impersonated by the mobile UI.

## Accreditation functionality

Native accreditation workspace links to AQAR dashboard, SSR dashboard, criteria, metrics, evidence requirements and evidence mappings. Criteria open details; metrics open mapped evidence, metric metadata and the requirement list filtered by metric. Linked download URLs use the existing authenticated native file transport. Backend nested progress/narrative/criteria summaries are rendered as labeled native data, with no mobile compliance calculation or invented percentage.

Read views use exact existing server relationships and role/tenant scoping. Report preview/export uses the shared server report engine with selected report type, template, criterion/metric and reporting dates; there is no invented dedicated AQAR/SSR binary-export endpoint. PDF, EXCEL and WORD formats are actual ReportFormat choices. No new accreditation editing, evidence verification, narrative approval or unsupported write operation was added. Available scoped reads and report actions are exposed; accreditation authoring remains in the existing website.

## Notifications and tasks

Notifications: infinite paginated recipient list, unread count, detail expansion, mark read/all read, 60-second polling, pull-to-refresh, empty/loading/error states, report-request responses and safe related-record navigation. Activity/GeneratedReport/IQACTask model targets are whitelisted and identifiers validated before navigation. Arbitrary action_url values are never executed. App focus/background behavior uses the existing root focusManager integration. No FCM/APNs push or device registration implementation is claimed.

Tasks: assigned-to-me and all-authorized lists, detail/status/priority/due-date display, authorized creation with owner selection, title/description/due-date/priority updates, start/complete/block/reopen/cancel, comments and activity history. College Management is read-only. Faculty assignment is restricted to self; department and tenant relationships are additionally validated by Django. Task update/status errors remain visible and history refetches. Creation supports the existing basic task fields, without inventing transitions or relationship IDs.

## Exact API integrations

All paths use /api/v1/; server-returned next/download URLs may use the existing /api/ alias. All application requests go through the centralized bearer/refresh client.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | reports/ | Scoped history, academic_year/department filters |
| GET | reports/{id}/ | Report detail/status |
| GET | reports/hod-downloaded-reports/ | Received reports with handoff flags |
| GET | reports/incharge-stored-reports/ | In-charge stored history |
| GET | report-types/, report-templates/, academic-years/, departments/, criteria/, metrics/ | Server selectors |
| POST | reports/preview/ | Server data preview |
| POST | reports/generate/ | PDF/EXCEL/WORD generation |
| POST | reports/incharge-faculty-report/ | In-charge generation for faculty_id |
| POST | reports/merge-reports/ | Existing Phase 4.1 merge workflow |
| POST | reports/{id}/submit-to-hod/ | In-charge handoff |
| POST | reports/{id}/hod-download/ | HOD acknowledgement |
| POST | reports/{id}/submit-to-admins/ | HOD handoff |
| GET | reports/{id}/download/ | Existing authorized binary downloads |
| POST | notifications/send-report-request/ | faculty_id and message |
| GET | notifications/incharge-requests/ | Sent requests and response history |
| POST | notifications/{id}/respond-report-request/ | Okay/Done/No |
| GET | notifications/, notifications/unread-count/ | Recipient list/count |
| POST | notifications/{id}/read/, notifications/mark-all-read/ | Read actions |
| GET | auth/users/?role=FACULTY, auth/users/ | Scoped faculty/owner selection |
| GET, POST | tasks/ | Task lists/create |
| GET, PATCH | tasks/{id}/ | Task detail/field updates |
| POST | tasks/{id}/{start,complete,block,reopen,cancel}/ | Actual status actions |
| GET, POST | tasks/{id}/comments/ | Comments |
| GET | tasks/{id}/activities/ | History |
| GET | aqar/dashboard/, ssr/dashboard/ | Server accreditation summaries |
| GET | criteria/, criteria/{id}/, metrics/, metrics/{id}/ | Catalog/detail |
| GET | metrics/{id}/evidence/ | Mapped verified evidence |
| GET | evidence-requirements/, evidence-requirements/?metric={id}, evidence-mappings/ | Requirements and linked records |

Report title/status filters apply explicitly to loaded pages; page totals are never presented as filtered institutional totals. Academic year/department query filters apply on the generic report list. HOD/In-charge custom history endpoints do not expose equivalent period-query support; no unsupported period behavior is claimed for those lists. Archived reports remain subject to backend visibility.

## Reliability and security

Generation and individual faculty report requests carry a retained Idempotency-Key for identical-body retries. Concurrent identical operations share a promise. Successful generation/request/create/comment actions are remembered during the mounted workflow to prevent accidental repeated taps. Keys and duplicate state are not durable across process termination/navigation. Changing the body or opening a new workflow represents a new operation. Existing merge protection remains unchanged.

Status transitions and read actions are not cached as permanently completed: complete -> reopen -> complete issues real subsequent calls. No unsafe automatic network retry added; failures invalidate related operations/dashboard/notification/unread queries while preserving errors. Existing coordinated JWT rotation, origin checks, private cache cleanup and logout behavior are retained. Resource identifiers used in action URLs are encoded. No token/private storage URL is rendered or placed in navigation URLs. Native OS sharing uses the Phase 4.1 authorized file implementation.

Django remains authoritative for college, department, recipient, task owner and report isolation. The mobile app does not query PostgreSQL directly or replace server-generated files. No backend permissions, schema, records, uploads or website source changed.

## Created/modified files

New mobile/src/features/operations/api.ts, common.tsx, Operations.tsx; new operations.tsx route in each existing six role directories; new mobile/tests/operations.test.ts. Replaced mobile/src/features/Notifications.tsx with the paginated notification center. Updated mobile/src/features/Dashboard.tsx with reports/tasks/accreditation shortcuts. This document is new. Existing Section/merge/activity routes remain available and protected.

## Actual tests and validation

- npm test: **67 passed**, 8 files, zero failed. Includes previous 53 tests plus 14 report/request/handoff/notification/task/response-mapping tests. Tests cover exact faculty response choices, in-charge request deduplication/role denial, generation key reuse after failure, all three report handoffs, authorization errors, backend accreditation value preservation, pagination/empty/mapped metric records, notification target whitelist, read actions, Management/faculty task restrictions, repeated completion after reopening, comment/history invalidation and no silent network retry.
- npm run typecheck: passed, exit 0.
- npm run lint: final result appended below.
- npx expo-doctor: **20/20 passed**, exit 0.
- Android Hermes export: passed, exit 0; 1387 modules, 27 assets, 3.9 MB bundle. Used a synthetic HTTPS origin for build validation; no live API request was made to it. This is an export, not an APK installation.
- adb devices: no connected device. emulator -list-avds: no configured AVD. No physical/emulator runtime, live backend login, actual report generation/acknowledgement, native notification navigation or deployed accreditation result was tested. Use an authorized device/emulator and disposable test backend accounts before release.
- Backend and website regressions were not rerun because their sources/dependencies were unchanged. Prior passing results are historical and are not represented as new checks. No database/migration/seed/deployment operations were performed.

## Remaining limitations and Phase 7 prerequisites

Unit/native-boundary tests do not establish complete screen rendering or end-to-end permissions. Test actual report generation, role handoffs, picker/file sharing, notification polling/navigation, task ownership and accreditation fields on an isolated device/backend environment. Review existing moderate Expo/tooling advisories before release. Runtime accessibility and long nested accreditation lists need device review.

Reporting periods in request messages are free text because the API lacks structured request period fields. Some custom report histories lack generic filters/status metadata; the UI displays available fields and avoids invented totals. Accreditation authoring/approvals and advanced editing remain on the website; this phase exposes summaries, relationships and report-engine previews/exports rather than claiming a complete accreditation-authoring mobile suite. The shared native renderer supports nested server data but does not substitute raw JSON/WebView for native screens.

No Phase 7 work was started. Review this phase and complete device/deployed-environment validation before any release or next-phase authorization.

Final ESLint result: exit 0, no errors or warnings. Final Phase 6 status: PASS for the implemented scope and available automated checks; device/live-backend validation remains pending.
