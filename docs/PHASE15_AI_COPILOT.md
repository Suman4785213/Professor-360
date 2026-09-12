# Phase 15: IQAC AI Copilot & Intelligent Assistant

## 1. Executive Summary & Core Principle

**Core Principle: "AI Assists, Not Decides"**

In high-stakes academic accreditation (NAAC/NIRF/NBA), artificial intelligence must never possess autonomous authoritative power. The IQAC AI Copilot is built with institutional quality governance guardrails ensuring:
- **Zero Autonomous Verification or Approval**: AI cannot mark evidence as verified, change approval statuses, or finalize AQAR/SSR submissions.
- **Zero Arbitrary Mutations**: AI cannot delete records, modify user permissions/roles, or execute arbitrary SQL.
- **Strict Role Scoping**: Faculty queries only access their own submissions; HOD and In-charge queries only access their department's data; IQAC Coordinators and College Management access institutional data.
- **Zero Hallucination Policy**: If verified data cannot be found in the college's verified records, the Copilot explicitly responds: *"I couldn't find verified records for that request."*
- **Explicit Human Confirmation for Actions**: Any mutation proposed by Copilot (e.g. creating a follow-up task or preparing a report) produces an unconfirmed `pending_action` requiring explicit human review and confirmation before execution.

---

## 2. Architecture Overview

```
                               ┌─────────────────────────────────────────┐
                               │           User Interaction              │
                               │   (Web Chat / Quick Prompt Chips)       │
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │       Security & Governance Layer       │
                               │  - Prompt Injection Defense             │
                               │  - Prohibited Pattern Interceptor       │
                               │  - College Tenant Isolation             │
                               │  - Role Permission Scoping              │
                               └────────────────────┬────────────────────┘
                                                    │
                                     [If prohibited action detected]
                                     ├──► Returns Quality Governance Alert
                                     │
                                     [If safe information/drafting query]
                                     ▼
                               ┌─────────────────────────────────────────┐
                               │        Allowlisted Tools Service        │
                               │  - get_faculty_count (Tenant scoped)    │
                               │  - get_activity_count (Verified only)   │
                               │  - search_evidence (Role restricted)    │
                               │  - get_metric_status (Criteria metrics) │
                               │  - get_gap_analysis (Missing evidence)  │
                               │  - propose_create_task (Pending human)  │
                               │  - propose_report_action (Pending human)│
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │       Dual-Provider AI Synthesizer      │
                               │  - Primary: OpenAI Provider             │
                               │  - Fallback: Deterministic Heuristic    │
                               │  - Grounded Provenance Source Citation  │
                               │  - Confidence Level Assignment          │
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │         Frontend AI Workspace           │
                               │  - Conversation History (Pin / Delete)  │
                               │  - Grounded Source Cards (Clickable)    │
                               │  - Action Proposal (Confirm / Dismiss)  │
                               │  - Feedback & Audit Traceability        │
                               │  - Evaluation Benchmarks (100% Passed)  │
                               └─────────────────────────────────────────┘
```

---

## 3. Database Models

The `apps.ai` application was extended with 5 models supporting Phase 15:

1. **`AICopilotConversation`**:
   - `id` (UUID, PK)
   - `college` (ForeignKey to `College`)
   - `user` (ForeignKey to `User`)
   - `title` (CharField, auto-generated from initial prompt)
   - `is_pinned` (BooleanField, default False)
   - `created_at`, `updated_at` (Timestamps)

2. **`AICopilotMessage`**:
   - `id` (UUID, PK)
   - `conversation` (ForeignKey to `AICopilotConversation`)
   - `role` (`USER`, `ASSISTANT`, `SYSTEM`)
   - `content` (TextField, formatted markdown response)
   - `intent` (CharField, e.g. `FACULTY_COUNT`, `ACTIVITY_COUNT`, `GAP_ANALYSIS`, `GOVERNANCE_INTERCEPT`)
   - `confidence_level` (`HIGH`, `NEEDS_REVIEW`, `NOT_ENOUGH_DATA`)
   - `sources` (JSONField, list of source items with `type`, `id`, `title`, `department`, `academic_year`, `is_verified`, `url`)
   - `suggested_actions` (JSONField, follow-up navigation/prompts)
   - `pending_action` (JSONField, structured payload for task creation or report generation)
   - `action_confirmed` (BooleanField, human approval flag)
   - `model_used`, `execution_time_ms`, `tokens_used`

3. **`AICopilotFeedback`**:
   - `id` (UUID, PK)
   - `message` (ForeignKey to `AICopilotMessage`)
   - `user` (ForeignKey to `User`)
   - `is_helpful` (BooleanField)
   - `reason` (`ACCURATE`, `HALLUCINATION`, `WRONG_ROLE_DATA`, `POOR_EXPLANATION`, `OTHER`)
   - `comment` (TextField)

4. **`AICopilotBenchmark`**:
   - Standard evaluation test cases stored for periodic automated regression testing across colleges.

---

## 4. Allowlisted Tools & Retrieval Governance

Located in `backend/apps/ai/services/copilot_tools.py`:
- **`get_faculty_count`**: Returns verified active faculty count strictly within the user's college and assigned department.
- **`get_activity_count`**: Computes verified activity totals filtered by category (FDP, Workshop, Conference) and academic year.
- **`search_evidence`**: Factual keyword lookup across verified evidence titles and descriptions. Faculty can only inspect their own records.
- **`get_metric_status`**: Pulls official criterion/metric numbers and returns mapped evidence records with active links.
- **`get_gap_analysis`**: Identifies metrics with 0 active mapped evidence records, providing actionable institutional alerts.
- **`propose_create_task`**: Prepares a draft task for missing deliverables. **Never creates the task autonomously**; returns a `pending_action` payload.
- **`propose_report_action`**: Prepares a draft report configuration with explicit human confirmation required.

---

## 5. Security & Governance Interceptors

Located in `backend/apps/ai/services/copilot_service.py`:
- **Adversarial Pattern Matching**: Detects attempts to bypass rules, alter verification statuses, verify evidence, sign off AQAR/SSR, or grant administrative privileges.
- **Immediate Intercept**: Returns standard `GOVERNANCE_INTERCEPT` intent and a prominent **Quality Governance Notice** informing the user that authoritative accreditation decisions require multi-stage human review (Department In-charge → HOD → IQAC).
- **Audit Logging**: All action confirmation decisions are logged in `apps.audit` with actor, timestamp, and college tenancy.

---

## 6. API Endpoints

All endpoints are protected by JWT authentication and tenant verification:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/copilot/chat/` | Send message turn, receive grounded response, sources, and action proposal |
| `GET` | `/api/ai/copilot/conversations/` | List user's conversations with pinned sorting |
| `POST` | `/api/ai/copilot/conversations/` | Create conversation thread |
| `PATCH` | `/api/ai/copilot/conversations/<id>/` | Update title or pin state |
| `POST` | `/api/ai/copilot/conversations/<id>/pin/` | Toggle pinned conversation |
| `DELETE` | `/api/ai/copilot/conversations/<id>/` | Delete conversation and messages |
| `GET` | `/api/ai/copilot/conversations/<id>/messages/` | Retrieve message history |
| `POST` | `/api/ai/copilot/confirm-action/` | Confirm (`true`) or dismiss (`false`) a proposed write action |
| `POST` | `/api/ai/copilot/feedback/` | Submit helpfulness rating and hallucination flags |
| `GET` | `/api/ai/copilot/benchmarks/` | Run automated QA evaluation suite across 6 standard criteria |

---

## 7. Frontend User Interface

Located in `frontend/src/features/copilot/`:
- **`CopilotPage.tsx`**: Main workspace with dual-provider indicator, role badge, conversation history drawer, search, pinned chats, and responsive message stream.
- **`SourceCard.tsx`**: Provenance cards with clickable navigation to `/iqac/evidence`, `/iqac/criteria`, or `/faculty/activities`.
- **`ActionProposalCard.tsx`**: Visual card displaying proposed action parameters with "Confirm & Execute" and "Cancel" buttons.
- **`FeedbackModal.tsx`**: User modal for rating responses and reporting hallucinations or scope defects.
- **`BenchmarkModal.tsx`**: Built-in evaluation interface providing live accuracy percentage, latency tracking, and zero-hallucination verification.
- **Navigation Shortcuts**:
  - Direct sidebar links for all 6 roles (`/ai/copilot`).
  - Header launcher button ("Ask Copilot").
  - Command Palette integration (`Ctrl+K` -> "Ask IQAC AI Copilot").

---

## 8. Automated Verification & Test Coverage

- **Phase 15 Test Suite (`apps.ai.tests_phase15`)**: 12 test cases verifying:
  1. AI cannot verify or approve evidence records (`test_01`)
  2. Adversarial prompt injection resistance (`test_02`)
  3. Multi-tenant isolation barrier (`test_03`)
  4. Role scoping for Faculty (`test_04`)
  5. Role scoping for HOD and Department In-charge (`test_05`)
  6. College-wide visibility for IQAC and Management (`test_06`)
  7. Exact structured counts with zero hallucinations (`test_07`)
  8. Missing data handling ("I couldn't find verified records...") (`test_08`)
  9. Provenance tracking with verified flags and direct links (`test_09`)
  10. Action proposal and explicit human confirmation pipeline (`test_10`)
  11. Conversation CRUD and feedback tracking (`test_11`)
  12. Benchmark evaluation API endpoint (`test_12`)
- **Full Platform Regression Suite**: 72 test cases across Phases 9, 10, 11, 12, 14, and 15 passed with **0 errors and 0 regressions**.
- **Live In-Browser Benchmark Evaluation**: **100% Pass Rate** (6/6 cases passed, 0 hallucinations, 0 governance violations).
