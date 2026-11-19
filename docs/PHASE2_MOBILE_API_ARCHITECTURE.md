# Professor360 mobile API architecture

Phase 2.1 source contract, 2026-11-14. Read together with [the complete route/serializer reference](PHASE2_MOBILE_API_REFERENCE.md), which is part of this contract and inventories 137 registered method/path combinations with input expressions, response construction, serializer field types, required flags, choices and authorization filters. Refresh is additionally documented below because its view is provided by SimpleJWT. Source, rather than incomplete OpenAPI annotations, is authoritative.

## Architecture and boundaries

React/TypeScript/Vite and future Expo clients share the existing Django REST Framework backend and PostgreSQL database. Django apps separate accounts, institutional catalogs, activities/documents, verification, evidence, reports, notifications/tasks and analytics. TenantMixin, view querysets, serializer relationship validation and role permissions cooperate to enforce access. PostgreSQL transactions serialize workflow mutations. Django storage supports local files and private S3 through an authenticated media gateway. No separate mobile database or mobile application is introduced.

Canonical base: /api/v1/. Existing /api/ aliases remain valid; follow download URLs returned by the server after resolving relative URLs against the API origin. Do not prepend /api/v1/ to a returned /api/... path. UUID identifiers are strings. Dates use YYYY-MM-DD; timestamps are ISO 8601. JSON is the default; uploads use multipart/form-data. All non-public calls use Authorization: Bearer <access>. Do not place tokens in URLs or log passwords/tokens.

## Common response and error contracts

Standard list endpoints use page and page_size (default 20, maximum 100): {count,total_pages,current_page,next,previous,results:[schema]}. Retrieve is a schema object, create is 201/schema, update is 200/schema, delete is 204/no body. Custom action arrays/objects are NOT automatically paginated. The endpoint reference identifies custom response constructors. Notifications, tasks, activities, verification, evidence and report history use standard pagination on their ordinary lists. Catalog public search, analytics, work queues, task comments/activities and report handoff lists are unpaginated.

Exceptions use {success:false,error:{code,message,request_id,details?},message,details?}. Legacy explicit failures may instead use {error:string} or {detail:string}; clients must accept both. HTTP 400: validation/invalid workflow; 401: invalid/expired authentication; 403: role/tenant denial; 404: missing or scoped-out resource; 405: unsupported method; 409: reused idempotency key with conflicting body or unavailable original; 429: throttle/quota; 500: server failure. Display safe messages; retain request ID for support. A transport timeout/offline failure has no HTTP status and must be handled separately. Retry a 401 once after a serialized refresh; never retry a 403 as an authentication failure.

## Six-role matrix

| Capability | Super Admin | Management | IQAC | HOD | In-charge | Faculty |
| --- | --- | --- | --- | --- | --- | --- |
| Records/evidence/report reads | Platform | College | College | Department | Department | Own |
| Faculty activity submission/edit | No author impersonation | No | No | No | No | Own editable records |
| Verification decisions | No implicit stage bypass | No | IQAC stage | HOD stage | In-charge stage | No |
| Report generation | Scoped platform | College | College | Department | Department | Own |
| Merge / submit to HOD | No | No | No | No | Department | No |
| HOD acknowledgement / admin handoff | No | No | No | Department | No | No |
| Notifications/preferences | Recipient only | Recipient only | Recipient only | Recipient only | Recipient only | Recipient only |
| Tasks | Platform | College, read only | College | Department/personal | Department/personal | Personal |

Stage actions additionally enforce explicit department/college equality. The actual permission classes and queryset guards are reproduced in the reference; do not infer privilege from a UI label. Existing analytics have broader aggregate visibility: most GET analytics require authentication and expose college aggregates even to faculty. This contract does not claim those aggregate endpoints have faculty-only visibility. Mobile screens should use faculty-participation/overview for faculty and avoid presenting institutional analytics as personal data.

## Institution selection and authentication

| Method/path | Roles/input | Success | Pagination |
| --- | --- | --- | --- |
| GET /api/v1/colleges/public/ | Public; q or search | 200 {results:[{id,name,short_name,code,city,state,accreditation_type,departments:[{id,name,code}]}],count} | None |
| POST /api/v1/auth/login/ | Public; email,password,college_id for institutional roles; is_super_admin:true or portal:super_admin for Super Admin | 200 {access,refresh,user:MeSerializer,success:true} | None |
| POST /api/v1/auth/refresh/ | refresh string | 200 {access,refresh}; old refresh blacklisted | None |
| GET /api/v1/auth/me/ | All authenticated | 200 MeSerializer | None |
| PATCH/PUT /api/v1/auth/me/ | PersonalProfileUpdateSerializer only | 200 personal fields | None |
| POST /api/v1/auth/logout/ | Authenticated; refresh string | 200 {success:true,message} | None |
| POST /api/v1/auth/change-password/ | Authenticated; see ChangePasswordSerializer | 200 custom response in reference | None |
| POST /api/v1/auth/forgot-password/ | Public; email | Generic message; never token | None |
| POST /api/v1/auth/reset-password/ | Public; token,new_password,confirm_password | Success or invalid/expired/used 400 | None |

Institution selection is client responsibility: use returned college UUID; wrong institution/portal is rejected. Preserve the separate Super Admin entry screen. Store access/refresh in native secure storage; rotate BOTH atomically. Current lifetimes are access 8 hours, refresh 30 days. Logout clears local storage even when networking fails. Access JWTs are not immediately revoked by refresh blacklisting. Existing account and institution suspension enforcement remains as implemented; do not treat JWT decoding as session authorization. Restore with /auth/me/ and accept server denial.

## Faculty, activities and files

GET/PATCH/PUT /api/v1/auth/faculty/profile/ is the current faculty profile; /api/v1/auth/faculty/profiles/ and /{id}/ provide scoped profile collection/detail. FacultyProfileSerializer includes identity/display fields, qualification, joining_date, employee_id, designation, phone, profile_photo, resume, resume_url, experience_years/duration, status and bio. Organizational identity cannot be reassigned through personal/profile writes. Use multipart for resume/photo fields; profile view parser/validation details are in the reference.

GET/POST /api/v1/activities/ and GET/PUT/PATCH/DELETE /api/v1/activities/{id}/ use ActivitySerializer. Faculty creates/updates its own editable activities; only its own DRAFT can be deleted. Responses include nested DocumentSerializer objects and is_editable. Search/filter/order declarations are in the reference. POST /activities/{id}/submit/ accepts optional comment and returns 200 {status,message}; repeated submissions after transition return 400 without another log/notification. POST /activities/check-duplicate/ accepts title,academic_year,category and returns is_duplicate,count,matches,warning; it is advisory, not an idempotency guarantee.

GET/POST /api/v1/documents/ and detail endpoints use DocumentSerializer. Upload multipart fields: activity UUID, file (required), optional file_name, document_type, category, description,is_primary. Preserve server field validation: PDF/JPG/JPEG/PNG only, signature/security validation, maximum 10 MiB. Let the native HTTP client set the multipart boundary. Response metadata includes file_name,original_filename,file_size,mime_type,file_hash,version,status,preview_url,download_url. Do not treat server FileField URLs as public bucket paths.

GET /api/v1/documents/{id}/preview/ and /download/ return authorized file bytes. /media/<path> also requires bearer authentication except public institutional logos. Reports use /reports/{id}/download/. No browser cookies are required. Save bytes into app-private temporary storage, use platform viewers, remove cached private bytes at logout, and use explicit user consent before exporting to shared storage. Error bodies may be JSON rather than file data; check status/content type before opening. Do not pass credentials to a different origin. Existing uploaded files are preserved.

## Verification and evidence

GET /api/v1/verifications/ and /{id}/ return VerificationRecordSerializer with activity_details and logs. Query filters: current_status/current_status__in, activity__academic_year/category/activity_type/department/faculty, search, ordering. Queue-specific GET /api/v1/work-queue/{my-work,iqac,hod,incharge,faculty}/ are registered custom actions; exact payload constructors and guards are in the reference. work-queues is an existing alias.

Decision POST endpoints /verifications/{id}/{incharge-verify,hod-verify,iqac-verify}/ accept decision APPROVE or REJECT, comment (required for rejection); IQAC additionally accepts target. Success 200 {status,message}. Normal path DRAFT -> PENDING_INCHARGE -> PENDING_HOD -> PENDING_IQAC -> VERIFIED_EVIDENCE. In-charge rejection -> RETURNED_TO_FACULTY; HOD rejection -> RETURNED_TO_INCHARGE. In-charge accepts both its pending state and returned state. Faculty resubmission preserves editable returned/rejected states. Legacy IQAC rejection mapping remains: FACULTY -> RETURNED_TO_FACULTY; HOD -> RETURNED_TO_INCHARGE; other/default DEPARTMENT_INCHARGE -> REJECTED_IQAC. Mobile must display the returned status, not infer it from target labels.

Activity row lock precedes verification-record lock. Only one competing transition commits; losing requests receive 400. Activity state, verification state/log and sealed evidence remain consistent. Database notification side effects participate in the transaction. External integration delivery is not a durable outbox; exactly-once external mail/webhook delivery is not claimed.

GET /api/v1/evidence/ uses EvidenceListSerializer; /{id}/ uses EvidenceDetailSerializer. Scoped filters and archive visibility are in the reference. GET /evidence/stats/, GET /evidence/export/, POST /evidence/bulk-zip/, POST /evidence/{id}/add-document/ are supported; archive/restore are restricted to Super Admin/IQAC. Export and ZIP return bytes, not paginated JSON. Evidence is produced by final verification, not arbitrary mobile creation.

## Reports and handoffs

ReportTypeSerializer and ReportTemplateSerializer are available via GET /api/v1/report-types/ and /report-templates/ (and detail). Use reported identifiers; do not hardcode catalog UUIDs. POST /reports/preview/ accepts ReportFilterRequestSerializer. POST /reports/generate/ adds output_format and optional template. Filter fields are report_type (required), academic_year,department,faculty,category,criterion,metric,date_from,date_to,search. Formats are the ReportFormat choices in the reference. Generate returns 201 GeneratedReportListSerializer; inspect status/error_message before downloading. Quota failure is 429. GET /reports/ and /reports/history/ are paginated; academic_year,department,format filter history.

| POST path under /api/v1/reports/ | Role/body | Success |
| --- | --- | --- |
| incharge-faculty-report/ | In-charge; faculty_id in own department/college | 201 {id,title,faculty_name,faculty_designation,file_url,record_count,generated_at,file_size} |
| merge-reports/ | In-charge; report_ids array (legacy comma string accepted); completed same-department PDF reports | 201 {id,title,source_count,record_count,file_size,generated_at,download_url,status} |
| {id}/submit-to-hod/ | In-charge; empty body; active department HOD required | 200 {status,message,report_id,submitted_at,hod_name} |
| {id}/hod-download/ | HOD; empty body | 200 {status,message,id,title,download_url} |
| {id}/submit-to-admins/ | HOD; empty body | 200 {status,message,report_id,submitted_at,recipients_count} |

HOD acknowledgement records receipt; actual bytes come from GET download. Admin handoff notifies Management/IQAC in the same college. History/list actions incharge-stored-reports,downloaded-history,hod-reports,hod-downloaded-reports return unpaginated {results:[...]} with exact item keys in the reference. Stored historical files/templates remain unchanged.

Send a fresh random Idempotency-Key header (maximum 128 characters) for each intentional generation or merge; persist the same key and identical JSON body for retries. Applies to generate, incharge-faculty-report and merge-reports. Keys are scoped by actor, role, college, department and action, hashed and persisted in report metadata. Same key/body replays the original status/body without generation or quota duplication; conflicting body returns 409. Archived/unavailable original returns 409. A different key intentionally creates a new historical report. Requests without keys retain legacy behavior and may create another report; the web client is unchanged. Reordered JSON object keys are normalized; array order remains significant.

Handoffs are intrinsically idempotent without a header. PostgreSQL row locks serialize concurrent handoffs. First successful responses are persisted and replayed; legacy already-completed handoffs return 200 {status:success,message:Already recorded.,id,report_id,download_url} without changing timestamps or sending notifications. Check success status rather than requiring first-submission-only fields. No destructive migration is needed. Filesystem writes are not transactional with PostgreSQL; a process/storage failure may leave an orphan file, which is never automatically deleted by retry code.

## Notifications and tasks

GET /api/v1/notifications/ and /{id}/ expose only the recipient and college. Filters category,priority,is_read,search; list paginated. Generic notification create/update/delete is unsupported (405); existing website uses explicit read actions. POST/PATCH /notifications/{id}/read/ -> 200 {status,id}; POST /notifications/mark-all-read/ -> {status,updated_count}; GET /notifications/unread-count/ -> {unread_count}. These count/read calls use the same filtered recipient queryset. GET/POST/PATCH /notifications/preferences/ uses NotificationPreferenceSerializer; channel_* aliases map to stored boolean fields. Push preference storage does not implement push delivery.

POST /notifications/send-report-request/ is In-charge only; /{id}/respond-report-request/ is recipient-scoped; GET /notifications/incharge-requests/ lists requests. Exact bodies and responses are in the reference. Sending a new report request has no generation idempotency key; do not blindly resend it after a timeout. Replying to an existing report request is row-locked: repeated identical choices return the current result without another notification; changing Okay to Done remains supported as a new response. Dispatcher cooldown deduplication remains best effort; workflow locks protect the tested approval/task/handoff side effects.

GET/POST /api/v1/tasks/ and detail GET/PUT/PATCH/DELETE use IQACTaskSerializer. Create requires title and owner UUID; optional description,department,academic_year,priority,due_date,related_metric,related_evidence,related_data_request. Related records must belong to the tenant. Faculty assigns itself; department staff assigns within its department. Management cannot create/update/delete/change status/comment. All roles see only scoped tasks. Query status,priority,department,owner,metric,academic_year,search and standard pagination.

POST/PATCH /tasks/{id}/{start,complete,block,reopen,cancel}/ takes optional comment and returns 200 IQACTaskSerializer. Statuses TODO,IN_PROGRESS,BLOCKED,COMPLETED,CANCELLED. Repeated identical status is a no-op; closed tasks must be reopened before a different status. PATCH status is rejected when it attempts to bypass actions. Concurrent completion produces one history entry/notification. GET /tasks/{id}/comments/ returns an unpaginated TaskCommentSerializer array; POST with nonempty comment returns 201 one comment. GET /tasks/{id}/activities/ returns TaskActivitySerializer array. GET /tasks/deadlines/ is a custom unpaginated object. Intentionally repeated comments are separate comments; no push/retry identity is implied.

Poll unread count and the first notification page every 30-60 seconds while foregrounded; back off on failures/429 and pause in background. Refresh after local read actions. Future push design (NOT IMPLEMENTED): authenticated device registration binding a device installation and provider token to the current user, platform and app version; per-user uniqueness, token rotation, logout unregister, inactive token cleanup, transactional outbox and provider retries, user preference checks, tenant validation, minimal lock-screen text and server-authorized deep-link fetch. No FCM/APNs endpoint is currently promised.

## Analytics

All registered GET /api/v1/analytics/{overview,executive,iqac-intelligence,academic-year-comparison,department-comparison,faculty-participation,evidence-health,verification-pipeline,gap-matrix,data-quality,ai-insights,forecast}/ require authentication; results are unpaginated custom JSON objects/arrays, not a common envelope. Exact top-level response construction is in the reference. Query academic_year is used by most summaries; department by comparison/participation/pipeline/intelligence; framework by gap-matrix; executive accepts college for unassigned Super Admin. Overview scopes activity counts to faculty/department; participation delegates user scoping; most other endpoints expose college aggregates. Some unassigned Super Admin summaries select the first college: explicitly choose institutional context where supported and do not assume a cross-college aggregate.

POST /analytics/ai-insights/ and /analytics/ai-insights/refresh/ accept academic_year, restricted to IQAC/Super Admin; return 201 AIExecutiveInsightSerializer array. GET on the refresh alias also resolves to the same list view. AI insights are advisory; no mobile verification action should be inferred from an insight.

## Known limits and rollout

OpenAPI still contains existing annotation warnings, so generated schema alone is insufficient. The source-derived reference and this document are the integration contract; regeneration script uses a nonexistent database/port and does not inspect institutional records. API contract inspection is not a promise of real SMTP, S3, Nginx or browser verification. Existing access-token lifetime, localStorage web storage, external integration placeholders and broad aggregate analytics visibility remain documented limitations. Test mobile integration with disposable accounts and review this phase before starting the mobile application. No Phase 3 work was started.
