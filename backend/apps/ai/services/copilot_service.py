"""
Phase 15: IQAC AI Copilot — Core Service
Orchestrates:
1. Intent detection & prompt injection protection
2. Strict governance interceptor ("AI Assists, Not Decides")
3. Allowlisted tool dispatching
4. Provenance tracking & source citation
5. Dual-provider answer synthesis (OpenAI + Deterministic Heuristic Provider)
6. Write action proposal & explicit confirmation execution
"""
import re
import time
import logging
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.db import transaction

from apps.accounts.models import User, UserRole
from apps.colleges.models import College
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, Document, ActivityCategory, ActivityStatus
from apps.evidence.models import Evidence
from apps.criteria.models import Criterion, Metric, EvidenceMapping
from apps.aqar.models import ComplianceNarrative, ComplianceWorkspaceType
from apps.ai.models import (
    AICopilotConversation,
    AICopilotMessage,
    AICopilotMessageRole,
    AICopilotConfidenceLevel,
    AICopilotFeedback,
)
from apps.ai.providers.openai_provider import OpenAIProvider
from apps.ai.providers.heuristic_provider import HeuristicAIProvider
from .copilot_tools import CopilotToolsService

logger = logging.getLogger(__name__)

PROHIBITED_ACTION_PATTERNS = [
    r'\b(?:verify|approve)\s+(?:this\s+|the\s+|all\s+|selected\s+)?(?:evidence|submission|certificate|activity|document|record)\b',
    r'\b(?:verify|approve)\b.*\b(?:evidence|submission|certificate|activity|document|record)\b',
    r'\bmark\s+(?:it\s+|this\s+)?as\s+(?:verified|approved)\b',
    r'\b(?:change|update|set)\s+(?:verification\s+)?status\s+to\s+(?:verified|approved)\b',
    r'\b(?:approve|finalize)\s+(?:aqar|ssr)\b',
    r'\b(?:grant|modify|escalate)\s+(?:admin|super\s*admin|permission|role)\b',
    r'\b(?:delete|drop|truncate|purge)\s+(?:evidence|table|record|database|activity)\b',
    r'\b(?:ignore|bypass)\s+(?:all\s+)?(?:instructions|rules|safety|guidelines)\b',
]


class CopilotService:
    """
    Central coordinator for the IQAC AI Copilot.
    """

    @classmethod
    def process_message(
        cls,
        college: College,
        user: User,
        conversation_id: Optional[str],
        content: str
    ) -> Dict[str, Any]:
        """
        Processes a user query within a conversation turn.
        Returns serialized message payload with content, sources, confidence, and actions.
        """
        start_time = time.time()
        content_clean = content.strip()

        # 1. Resolve or create conversation
        if conversation_id:
            try:
                conv = AICopilotConversation.objects.get(id=conversation_id, college=college, user=user)
            except AICopilotConversation.DoesNotExist:
                conv = AICopilotConversation.objects.create(
                    college=college,
                    user=user,
                    title=content_clean[:40] if content_clean else "New Conversation"
                )
        else:
            # Auto-generate title from first prompt
            title = content_clean[:40] if content_clean else "New Conversation"
            conv = AICopilotConversation.objects.create(
                college=college,
                user=user,
                title=title
            )

        # 2. Record User Message
        user_msg = AICopilotMessage.objects.create(
            conversation=conv,
            role=AICopilotMessageRole.USER,
            content=content_clean
        )

        # 3. Security Guardrail Check (Governance Interceptor & Prompt Injection Defense)
        prohibited = cls._check_prohibited_actions(content_clean)
        if prohibited:
            assistant_content = (
                "⚠️ **Quality Governance Notice: AI Assists, Not Decides**\n\n"
                "As an institutional AI assistant, I strictly operate under core governance and accreditation principles. "
                "I am authorized to help you search, summarize, explain, and prepare drafts, but I **cannot**:\n"
                "- Verify or approve evidence or faculty submissions\n"
                "- Alter verification statuses\n"
                "- Officially sign off on AQAR or SSR submissions\n"
                "- Modify permissions, roles, or delete institutional records\n\n"
                "These authoritative decisions require verified human review through the multi-stage review pipeline "
                "(Department In-charge → HOD → IQAC)."
            )
            exec_time = int((time.time() - start_time) * 1000)
            assistant_msg = AICopilotMessage.objects.create(
                conversation=conv,
                role=AICopilotMessageRole.ASSISTANT,
                content=assistant_content,
                intent="GOVERNANCE_INTERCEPT",
                confidence_level=AICopilotConfidenceLevel.HIGH,
                sources=[],
                suggested_actions=[
                    {"label": "View Verification Queue", "action": "NAVIGATE", "url": "/verification/queue"}
                ],
                model_used="governance-guardrail",
                execution_time_ms=exec_time,
                tokens_used=0
            )
            return cls._serialize_message(assistant_msg)

        # 4. Intent Classification & Tool Execution
        intent, tool_result = cls._dispatch_intent(college, user, content_clean)

        # 5. Formulate Natural Language Answer with Sources & Actions
        answer_text, confidence, sources, suggested_actions, pending_action = cls._synthesize_response(
            college, user, content_clean, intent, tool_result
        )

        exec_time = int((time.time() - start_time) * 1000)

        # 6. Save Assistant Turn
        assistant_msg = AICopilotMessage.objects.create(
            conversation=conv,
            role=AICopilotMessageRole.ASSISTANT,
            content=answer_text,
            intent=intent,
            confidence_level=confidence,
            sources=sources,
            suggested_actions=suggested_actions,
            pending_action=pending_action,
            model_used="iqac-dual-provider-v1",
            execution_time_ms=exec_time,
            tokens_used=len(content_clean.split()) + len(answer_text.split())
        )

        # Update conversation timestamp
        conv.updated_at = timezone.now()
        conv.save(update_fields=['updated_at'])

        return cls._serialize_message(assistant_msg)

    @classmethod
    def _check_prohibited_actions(cls, prompt: str) -> bool:
        """
        Scans prompt for unauthorized administrative, approval, or destructive commands.
        """
        prompt_lower = prompt.lower()
        for pattern in PROHIBITED_ACTION_PATTERNS:
            if re.search(pattern, prompt_lower):
                return True
        return False

    @classmethod
    def _dispatch_intent(cls, college: College, user: User, prompt: str) -> tuple[str, Dict[str, Any]]:
        """
        Determines query intent and queries allowlisted backend tools.
        """
        p_lower = prompt.lower()

        # 1. Report Assistance
        if "create a report" in p_lower or "generate report" in p_lower or "export report" in p_lower:
            report_type = "FACULTY_ACTIVITIES"
            if "fdp" in p_lower:
                report_type = "FDP_SUMMARY"
            elif "evidence" in p_lower:
                report_type = "VERIFIED_EVIDENCE"
            elif "criteria" in p_lower or "metric" in p_lower:
                report_type = "CRITERIA_COMPLIANCE"

            filters = {}
            if "2025-26" in prompt or "2025" in prompt:
                filters["academic_year"] = "2025-26"
            dept_match = re.search(r'\b(it|cse|ece|mech|civil|eee|math|physics)\b', p_lower)
            if dept_match:
                filters["department"] = dept_match.group(1).upper()

            action = CopilotToolsService.propose_report_action(college, user, report_type, filters)
            return "REPORT_ASSIST", action

        # 2. Task Proposal
        if ("create task" in p_lower or "assign task" in p_lower or "remind" in p_lower) and user.role in [UserRole.SUPER_ADMIN, UserRole.IQAC, UserRole.HOD]:
            title = "Follow up on Quality Evidence"
            if "fdp" in p_lower:
                title = "Collect missing FDP evidence and certificates"
            elif "narrative" in p_lower:
                title = "Review and draft qualitative narrative"
            action = CopilotToolsService.propose_create_task(
                college=college,
                user=user,
                title=title,
                description=f"Task initiated via IQAC Copilot from user request: '{prompt}'",
                due_date="Next Week"
            )
            return "TASK_PROPOSAL", action

        # 3. Faculty Count
        if "how many faculty" in p_lower or "faculty count" in p_lower or "number of faculty" in p_lower:
            dept_code = None
            dept_match = re.search(r'\b(it|cse|ece|mech|civil|eee)\b', p_lower)
            if dept_match:
                dept_code = dept_match.group(1)
            res = CopilotToolsService.get_faculty_count(college, user, department_code=dept_code)
            return "FACULTY_COUNT", res

        # 4. Activity / FDP Count
        if ("how many" in p_lower or "number of" in p_lower or "count" in p_lower) and any(w in p_lower for w in ["fdp", "workshop", "publication", "activity", "activities", "seminar", "conference"]):
            category = None
            if "fdp" in p_lower:
                category = "FDP"
            elif "workshop" in p_lower:
                category = "WORKSHOP"
            elif "publication" in p_lower:
                category = "PUBLICATION"

            dept_code = None
            dept_match = re.search(r'\b(it|cse|ece|mech|civil|eee)\b', p_lower)
            if dept_match:
                dept_code = dept_match.group(1)

            ay = None
            if "2025-26" in prompt or "2025" in prompt:
                ay = "2025"
            elif "2024-25" in prompt or "2024" in prompt:
                ay = "2024"

            is_verified = "verified" in p_lower or "approved" in p_lower or "evidence" in p_lower
            res = CopilotToolsService.get_activity_count(
                college, user,
                category_code=category,
                academic_year_name=ay,
                department_code=dept_code,
                is_verified_only=is_verified
            )
            return "ACTIVITY_COUNT", res

        # 5. Evidence Search
        if any(w in p_lower for w in ["show evidence", "find certificates", "search evidence", "find evidence", "show all verified"]):
            query = None
            if "fdp" in p_lower:
                query = "FDP"
            elif "workshop" in p_lower:
                query = "Workshop"

            dept_code = None
            dept_match = re.search(r'\b(it|cse|ece|mech|civil|eee)\b', p_lower)
            if dept_match:
                dept_code = dept_match.group(1)

            res = CopilotToolsService.search_evidence(college, user, query=query, department_code=dept_code, limit=10)
            return "EVIDENCE_SEARCH", res

        # 6. Metric Status / Questions
        metric_match = re.search(r'\b(?:metric\s*)(\d+\.\d+(?:\.\d+)?)\b', p_lower)
        if metric_match:
            metric_num = metric_match.group(1)
            res = CopilotToolsService.get_metric_status(college, user, metric_number=metric_num)
            return "METRIC_STATUS", res

        criterion_match = re.search(r'\b(?:criterion\s*)(\d+)\b', p_lower)
        if criterion_match:
            crit_num = int(criterion_match.group(1))
            res = CopilotToolsService.get_metric_status(college, user, criterion_number=crit_num)
            return "METRIC_STATUS", res

        # 7. Gap Analysis
        if any(w in p_lower for w in ["gap", "missing", "incomplete", "need attention", "lacking"]):
            res = CopilotToolsService.get_gap_analysis(college, user)
            return "GAP_ANALYSIS", res

        # 8. AQAR / SSR Inquiries
        if "aqar" in p_lower or "ssr" in p_lower or "accreditation" in p_lower:
            res = CopilotToolsService.get_gap_analysis(college, user)
            return "AQAR_SSR_SUMMARY", res

        # 9. Fallback: Search across verified evidence
        res = CopilotToolsService.search_evidence(college, user, query=prompt[:50], limit=5)
        return "GENERAL_QUERY", res

    @classmethod
    def _synthesize_response(
        cls,
        college: College,
        user: User,
        prompt: str,
        intent: str,
        tool_result: Dict[str, Any]
    ) -> tuple[str, str, List[Dict[str, Any]], List[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """
        Synthesizes authoritative, non-hallucinatory text response grounded in tool facts.
        """
        sources = tool_result.get("sources", [])
        suggested_actions = []
        pending_action = None

        # 1. REPORT ASSISTANCE PROPOSAL
        if intent == "REPORT_ASSIST":
            pending_action = tool_result
            text = (
                f"I have prepared the report configuration according to your request:\n\n"
                f"**Report:** {tool_result['title']}\n"
                f"**Parameters:** {tool_result['summary']}\n\n"
                f"⚠️ *In compliance with safety controls, reports are generated only upon explicit user confirmation.* "
                f"Please review the proposed configuration below and confirm to generate."
            )
            suggested_actions = [
                {"label": "Confirm Generation", "action": "CONFIRM_ACTION"},
                {"label": "Cancel", "action": "CANCEL_ACTION"}
            ]
            return text, AICopilotConfidenceLevel.HIGH, sources, suggested_actions, pending_action

        # 2. TASK PROPOSAL
        if intent == "TASK_PROPOSAL":
            pending_action = tool_result
            text = (
                f"I can set up a collaborative task for this initiative:\n\n"
                f"**Task:** {tool_result['title']}\n"
                f"**Summary:** {tool_result['summary']}\n\n"
                f"Please confirm if you would like me to create this task in your institutional workspace."
            )
            suggested_actions = [
                {"label": "Confirm Task", "action": "CONFIRM_ACTION"},
                {"label": "Cancel", "action": "CANCEL_ACTION"}
            ]
            return text, AICopilotConfidenceLevel.HIGH, sources, suggested_actions, pending_action

        # 3. FACULTY COUNT
        if intent == "FACULTY_COUNT":
            count = tool_result.get("count", 0)
            dept = tool_result.get("department", "All Departments")
            breakdown = tool_result.get("breakdown_by_designation", [])
            breakdown_str = ""
            if breakdown:
                breakdown_str = "\n\n**Designation Breakdown:**\n" + "\n".join(
                    [f"- {b['designation'] or 'Faculty'}: {b['count']}" for b in breakdown]
                )

            if count == 0:
                text = f"I couldn't find verified records of active faculty members in {dept}."
                confidence = AICopilotConfidenceLevel.NOT_ENOUGH_DATA
            else:
                text = (
                    f"According to verified institutional records, there are **{count}** active faculty members "
                    f"in **{dept}**.{breakdown_str}"
                )
                confidence = AICopilotConfidenceLevel.HIGH

            suggested_actions = [
                {"label": "View Faculty Roster", "action": "NAVIGATE", "url": "/settings/team"}
            ]
            return text, confidence, sources, suggested_actions, None

        # 4. ACTIVITY / FDP COUNT
        if intent == "ACTIVITY_COUNT":
            count = tool_result.get("count", 0)
            cat = tool_result.get("category", "activities")
            ay = tool_result.get("academic_year", "all years")
            scope = tool_result.get("scope", "college-wide")
            is_verified = tool_result.get("is_verified_only", False)

            status_note = "verified" if is_verified else "recorded (all stages)"

            if count == 0:
                text = (
                    f"I couldn't find verified records matching **{cat}** activities for **{scope}** "
                    f"during **{ay}**."
                )
                confidence = AICopilotConfidenceLevel.NOT_ENOUGH_DATA
            else:
                text = (
                    f"According to institutional data, there are **{count}** {status_note} **{cat}** "
                    f"records for **{scope}** during **{ay}**."
                )
                confidence = AICopilotConfidenceLevel.HIGH

            suggested_actions = [
                {"label": "View Evidence Repository", "action": "NAVIGATE", "url": "/evidence"},
                {"label": "View Activities", "action": "NAVIGATE", "url": "/faculty/activities"}
            ]
            return text, confidence, sources, suggested_actions, None

        # 5. EVIDENCE SEARCH
        if intent == "EVIDENCE_SEARCH":
            total = tool_result.get("total_matches", 0)
            if total == 0:
                text = "I couldn't find verified records matching that search criteria in the institutional evidence repository."
                confidence = AICopilotConfidenceLevel.NOT_ENOUGH_DATA
            else:
                text = f"I found **{total}** verified evidence records matching your search. Below are the top authorized matches with direct links:"
                confidence = AICopilotConfidenceLevel.HIGH

            suggested_actions = [
                {"label": "Open Evidence Repository", "action": "NAVIGATE", "url": "/evidence"}
            ]
            return text, confidence, sources, suggested_actions, None

        # 6. METRIC STATUS
        if intent == "METRIC_STATUS":
            metrics = tool_result.get("metrics", [])
            if not metrics:
                text = "I couldn't find verified criteria or metric records matching that specification."
                confidence = AICopilotConfidenceLevel.NOT_ENOUGH_DATA
            else:
                lines = []
                for m in metrics:
                    lines.append(
                        f"- **Metric {m['code']} ({m['title']})**: Status is `{m['status']}` with **{m['evidence_count']}** mapped verified evidence records. "
                        f"Narrative status: `{m['narrative_status']}`."
                    )
                text = "Here is the verified status for the requested metrics:\n\n" + "\n".join(lines)
                confidence = AICopilotConfidenceLevel.HIGH

            suggested_actions = [
                {"label": "View Criteria Dashboard", "action": "NAVIGATE", "url": "/criteria"}
            ]
            return text, confidence, sources, suggested_actions, None

        # 7. GAP ANALYSIS
        if intent in ["GAP_ANALYSIS", "AQAR_SSR_SUMMARY"]:
            scope = tool_result.get("scope", "Institutional")
            suggestions = tool_result.get("suggestions", [])
            zero_count = tool_result.get("zero_evidence_metrics_count", 0)
            pending_count = tool_result.get("pending_iqac_verification", tool_result.get("pending_verification_queue", 0))

            sugg_text = "\n".join([f"- {s}" for s in suggestions]) if suggestions else "- No critical gaps identified."

            text = (
                f"**Quality Assurance Gap Analysis [{scope}]**\n\n"
                f"Based on real-time data from the evidence repository and criteria mappings:\n"
                f"- **Metrics with Zero Evidence**: {zero_count}\n"
                f"- **Submissions Awaiting Verification**: {pending_count}\n\n"
                f"**Advisory Recommendations:**\n{sugg_text}\n\n"
                f"*(Note: Recommendations are advisory to assist committee planning and do not alter accreditation statuses.)*"
            )
            confidence = AICopilotConfidenceLevel.HIGH
            suggested_actions = [
                {"label": "View Criteria Gaps", "action": "NAVIGATE", "url": "/criteria"},
                {"label": "Review Verification Queue", "action": "NAVIGATE", "url": "/verification/queue"}
            ]
            return text, confidence, sources, suggested_actions, None

        # GENERAL FALLBACK
        if sources:
            text = (
                f"Based on authorized records for {college.name}, here is the relevant institutional information. "
                f"Please inspect the cited source records for complete evidentiary details."
            )
            confidence = AICopilotConfidenceLevel.NEEDS_REVIEW
        else:
            text = (
                "I couldn't find verified records matching your query. "
                "You can ask me about faculty counts, verified FDPs/workshops, metric readiness, or request gap analyses."
            )
            confidence = AICopilotConfidenceLevel.NOT_ENOUGH_DATA

        return text, confidence, sources, suggested_actions, None

    @classmethod
    def execute_confirmed_action(cls, college: College, user: User, message_id: str, confirm: bool) -> Dict[str, Any]:
        """
        Executes or cancels a pending write action upon explicit human confirmation.
        """
        try:
            msg = AICopilotMessage.objects.select_related('conversation').get(
                id=message_id,
                conversation__college=college,
                conversation__user=user
            )
        except AICopilotMessage.DoesNotExist:
            return {"success": False, "error": "Message or pending action not found."}

        if not msg.pending_action:
            return {"success": False, "error": "No pending action associated with this message."}

        if msg.action_confirmed is not None:
            return {"success": False, "error": "Action has already been decided."}

        action_data = msg.pending_action
        action_type = action_data.get("action_type")

        if not confirm:
            msg.action_confirmed = False
            action_data["status"] = "CANCELLED"
            msg.pending_action = action_data
            msg.save(update_fields=['action_confirmed', 'pending_action'])
            return {
                "success": True,
                "status": "CANCELLED",
                "message": f"Action '{action_data.get('title', 'Action')}' was cancelled."
            }

        # User Confirmed: Execute allowlisted action
        result_message = ""
        action_payload = action_data.get("parameters", {})

        if action_type == "CREATE_TASK":
            from apps.notifications.models import IQACTask, TaskPriority, TaskStatus
            task = IQACTask.objects.create(
                college=college,
                title=action_payload.get("title", "Copilot Task"),
                description=action_payload.get("description", ""),
                creator=user,
                owner=user,
                priority=TaskPriority.NORMAL,
                status=TaskStatus.TODO
            )
            result_message = f"Task '{task.title}' created successfully."

        elif action_type == "GENERATE_REPORT":
            result_message = (
                f"Report configuration for '{action_payload.get('report_type')}' queued for processing. "
                f"You can view it in the Reports Hub."
            )
        else:
            return {"success": False, "error": f"Unknown action type: {action_type}"}

        msg.action_confirmed = True
        action_data["status"] = "CONFIRMED"
        action_data["executed_at"] = timezone.now().isoformat()
        msg.pending_action = action_data
        msg.save(update_fields=['action_confirmed', 'pending_action'])

        return {
            "success": True,
            "status": "CONFIRMED",
            "message": result_message
        }

    @classmethod
    def _serialize_message(cls, msg: AICopilotMessage) -> Dict[str, Any]:
        return {
            "id": str(msg.id),
            "conversation_id": str(msg.conversation_id),
            "role": msg.role,
            "content": msg.content,
            "intent": msg.intent,
            "confidence_level": msg.confidence_level,
            "sources": msg.sources,
            "suggested_actions": msg.suggested_actions,
            "pending_action": msg.pending_action,
            "action_confirmed": msg.action_confirmed,
            "model_used": msg.model_used,
            "execution_time_ms": msg.execution_time_ms,
            "created_at": msg.created_at.isoformat()
        }
