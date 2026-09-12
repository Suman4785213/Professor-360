# Phase 14: Data Import, Integrations & Interoperability

## 1. Overview & Architecture

Phase 14 delivers a safe, high-throughput, multi-tenant integration and data import layer for the College IQAC SaaS platform. It enables institutions to seamlessly onboard historical data from spreadsheets, external ERPs, and institutional databases into the IQAC platform without manual re-entry, while maintaining zero business logic compromises or evidence poisoning.

### Core Architectural Principles:
1. **Zero Evidence Contamination**: Imported activities strictly enter the workflow as `status='DRAFT'` and `source='IMPORT'`. They **never** bypass the multi-stage verification pipeline (`Department In-charge` → `HOD` → `IQAC`). Only after rigorous human audit and sealing does a record become formal `Evidence`.
2. **Strict Multi-Tenant Isolation**: Imports, templates, API keys, webhooks, and exports are strictly constrained by the tenant context (`request.user.college`). A college cannot view, process, validate, or export another college's data.
3. **Atomic Transactional Safety**: File execution runs in an atomic block (`transaction.atomic()`). If an unhandled or fatal error occurs, database savepoints ensure rollbacks prevent corrupted partial records.
4. **Formula Injection Sanitization**: All incoming and outgoing spreadsheet cells starting with `=, +, -, @, \t, \r` are automatically escaped with single quotes to prevent CSV/Excel formula injection attacks (CWE-1236).
5. **Strict 6-Role Hierarchy Preserved**: Roles remain strictly:
   - Super Admin
   - College Management
   - IQAC
   - HOD
   - Department In-charge
   - Faculty
   Imported users are strictly provisioned with the `FACULTY` role and assigned cryptographically secure one-way hashed credentials.

---

## 2. Supported Data Types & Templates

| Data Type | Description | Key Identifier / Natural Key | Target Models |
| :--- | :--- | :--- | :--- |
| `DEPARTMENTS` | Academic & operational departments | `code`, `name` | `core.Department` |
| `PROGRAMS` | Degree programs linked to departments | `code`, `name`, `department` | `core.Program` |
| `ACADEMIC_YEARS`| Academic cycles & reporting periods | `name` (e.g. `2024-25`) | `core.AcademicYear` |
| `FACULTY` | Faculty roster with designations | `email`, `employee_id` | `core.User`, `core.FacultyProfile` |
| `ACTIVITIES` | Publications, FDPs, workshops | `title`, `user_email`, `academic_year` | `activities.Activity` (`source='IMPORT'`, `status='DRAFT'`) |
| `STUDENTS` | Student enrollment & summary cohorts | `roll_number`, `email` | `core.StudentProfile` (or summary records) |

Pre-formatted, styled `.xlsx` and standard `.csv` templates are downloadable directly from `/api/imports/templates/download/?data_type={type}&format={xlsx|csv}` or through the UI dropdown.

---

## 3. The 6-Step Guided Import Workflow

1. **Step 1: Download Standard Template**: Select target data type and download an annotated spreadsheet with sample rows.
2. **Step 2: Upload File & Select Mode**: Upload `.xlsx` or `.csv` (up to 50MB). Select execution mode:
   - `INSERT_ONLY`: Fails or skips duplicates; inserts new records only.
   - `INSERT_AND_UPDATE`: Updates existing records if matched by unique natural keys, creates new records otherwise.
3. **Step 3: Column Mapping & AI Assistant**: Map raw sheet columns to canonical fields. Includes an AI heuristic auto-mapping engine (`/api/imports/jobs/suggest-mapping/`) that calculates fuzzy matching and confidence scores.
4. **Step 4: Dry-Run Validation & Deduplication**: Runs row-by-row validation without committing to the database:
   - Evaluates foreign key relationships (e.g., verifying department code exists in the college).
   - Classifies each row into: `NEW`, `DUPLICATE`, `POSSIBLE_DUPLICATE`, `UPDATE`, or `INVALID`.
   - Generates an actionable error table with row number, column, error description, and suggested fix.
5. **Step 5: Review & Preview**: Displays a paginated preview table of the first 25 rows with color-coded status badges and discrepancy alerts.
6. **Step 6: Safe Execution & Audit Log**: Executes the batch import within a database transaction, tracks progress, and links all created activity records to the `import_job_id` for auditability and bulk rollback.

---

## 4. Third-Party Integrations & Interoperability

### API Key Authentication (`/api/integrations/v1/`)
- API keys use the standard prefix `iqac_live_...` with 40-character cryptographically secure random entropy.
- Stored exclusively as PBKDF2 hashes; raw keys are revealed **only once** upon generation.
- Scoped permissions:
  - `read:faculty`: Query faculty rosters.
  - `write:activities`: Push draft activities from institutional ERPs (auto-tagged `source='API'`).
  - `read:evidence`: Query sealed evidence metadata.
  - `read:reports`: Query generated AQAR/SSR summaries.

### Webhook Delivery Engine
- Outgoing webhooks notify external college systems of milestone quality events:
  - `activity.submitted`
  - `activity.verified`
  - `evidence.sealed`
  - `report.generated`
  - `import.completed`
- Every webhook payload is signed using HMAC-SHA256 in the `X-IQAC-Signature` header using the college's endpoint secret.
- Webhook deliveries are tracked in `WebhookDeliveryLog` with status code, response time, retry counts, and payload previews.

### Controlled Export Engine
- Authorized roles can export filtered data to `.xlsx`, `.csv`, or `.json` (`/api/imports/export/`).
- Scope enforcement:
  - `Faculty`: Strictly restricted to own activities and submissions.
  - `HOD` & `Department In-charge`: Strictly restricted to assigned department.
  - `IQAC` & `College Management`: College-wide oversight.
- Every export is recorded in the platform `AuditLog` with requester, row count, filters, and timestamp.

---

## 5. Security Controls & Guardrails

| Threat Vector | Mitigation Strategy |
| :--- | :--- |
| **Cross-Tenant Data Leak** | Foreign keys and queries strictly scoped by `request.user.college`. Jobs, templates, API keys, and webhooks enforce tenant ownership. |
| **Formula Injection (CWE-1236)** | Cells starting with `=, +, -, @, \t, \r` are prepended with a single quote in parser and exporter. |
| **Malicious File Upload** | Openpyxl parser verifies ZIP/XML container magic bytes. File size capped at 50MB. Path traversal prevented via UUID file storage. |
| **Privilege Escalation** | Imported users are hard-coded to `UserRole.FACULTY`. Admin/IQAC/HOD roles cannot be provisioned via spreadsheet imports. |
| **Unauthorized Evidence Sealing** | Imported records initialize strictly with `status='DRAFT'`. Only human reviewers through the 3-stage pipeline can seal evidence. |
| **API Key Theft** | Raw keys never stored in database. Keys can be revoked or rotated instantly by IQAC Coordinators. |

---

## 6. Verification & Automated Test Results

- **Unit & Integration Tests**: 11 new automated test cases in `apps.imports.tests_phase14`:
  - `test_01_activity_source_and_import_job_id_fields`
  - `test_02_template_download_csv_and_xlsx`
  - `test_03_spreadsheet_parser_csv_and_formula_sanitization`
  - `test_04_import_validation_and_duplicate_detection`
  - `test_05_import_execution_insert_only`
  - `test_06_import_execution_insert_and_update`
  - `test_07_api_key_generation_and_authentication`
  - `test_08_webhook_creation_and_payload_signing`
  - `test_09_controlled_export_scoping`
  - `test_10_tenant_isolation_on_import_jobs`
  - `test_11_ai_mapping_suggestions`
- **Combined Regression Suite**: 60 test cases passed across all phases (`Ran 60 tests in 193.015s — OK`).
- **Frontend Quality Assurance**:
  - `npm run build`: Exit code 0 (TypeScript compile and Vite bundling).
  - `npm run lint`: 0 errors.
- **Visual Verification**: Browser subagent validated `/imports`, `/imports/migration`, and `/settings/integrations`.
