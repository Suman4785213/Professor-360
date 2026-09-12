"""
Phase 15: IQAC AI Copilot — Allowlisted Tools & Retrieval Service
Strictly enforce:
1. Tenant isolation (request.user.college)
2. Role permissions (Faculty: own data, In-charge/HOD: department, IQAC/Management: college)
3. Zero SQL execution — only deterministic Django ORM queries
4. AI Assists, Not Decides — verify/approve/delete actions strictly prohibited
"""
import logging
from typing import Dict, Any, List, Optional
from django.db.models import Q, Count
from django.utils import timezone
from django.core.exceptions import PermissionDenied

from apps.accounts.models import User, UserRole, FacultyProfile
from apps.colleges.models import College
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.programs.models import Program
from apps.activities.models import Activity, Document, ActivityStatus, ActivityCategory
from apps.evidence.models import Evidence
from apps.criteria.models import Criterion, Metric, EvidenceMapping
from apps.aqar.models import ComplianceNarrative, ComplianceWorkspaceType
from apps.ai.models import AIProcessingJob, AIExtractionResult

logger = logging.getLogger(__name__)


class CopilotGovernanceViolation(Exception):
    """Raised when an action violates the 'AI Assists, Not Decides' rule."""
    pass


class CopilotToolsService:
    """
    Allowlisted, safe query tools for the IQAC Copilot.
    All methods take (college, user) as mandatory first parameters.
    """

    @staticmethod
    def get_faculty_count(college, user, department_code: Optional[str] = None) -> Dict[str, Any]:
        """
        Retrieves active faculty counts with role-aware scoping.
        """
        qs = User.objects.filter(college=college, role=UserRole.FACULTY, is_active=True)

        # Role Scoping
        if user.role in [UserRole.HOD, UserRole.DEPARTMENT_INCHARGE]:
            if user.department:
                qs = qs.filter(department=user.department)
                dept_name = user.department.name
            else:
                qs = qs.none()
                dept_name = "Unassigned Department"
        elif department_code:
            dept = Department.objects.filter(college=college, code__iexact=department_code).first()
            if dept:
                qs = qs.filter(department=dept)
                dept_name = dept.name
            else:
                return {
                    "count": 0,
                    "department": department_code,
                    "message": f"Department with code '{department_code}' not found in this college.",
                    "sources": []
                }
        else:
            dept_name = "All College Departments"

        total_count = qs.count()

        # Gather sample faculty references for provenance
        sample_faculty = list(qs.select_related('department')[:10])
        sources = [
            {
                "type": "FACULTY",
                "id": str(f.id),
                "title": f.get_full_name(),
                "department": f.department.name if f.department else "General",
                "academic_year": "Active Roster",
                "is_verified": True,
                "url": f"/admin/users" if user.role == UserRole.SUPER_ADMIN else f"/settings/team"
            }
            for f in sample_faculty
        ]

        return {
            "count": total_count,
            "department": dept_name,
            "breakdown_by_designation": list(
                FacultyProfile.objects.filter(user__in=qs)
                .values('designation')
                .annotate(count=Count('id'))
                .order_by('-count')
            ),
            "sources": sources
        }

    @staticmethod
    def get_activity_count(
        college,
        user,
        category_code: Optional[str] = None,
        academic_year_name: Optional[str] = None,
        department_code: Optional[str] = None,
        is_verified_only: bool = False
    ) -> Dict[str, Any]:
        """
        Retrieves activity counts (e.g. FDPs, workshops, publications) with role scoping.
        """
        if is_verified_only:
            qs = Evidence.objects.filter(college=college, status='ACTIVE', is_verified=True)
            user_field = 'faculty'
            dept_field = 'department'
            ay_field = 'academic_year__name'
            cat_field = 'category'
        else:
            qs = Activity.objects.filter(college=college)
            user_field = 'faculty'
            dept_field = 'faculty__department'
            ay_field = 'academic_year__name'
            cat_field = 'category__code'

        # Role Scoping
        if user.role == UserRole.FACULTY:
            filter_kwargs = {user_field: user}
            qs = qs.filter(**filter_kwargs)
            scope_desc = f"Faculty ({user.get_full_name()})"
        elif user.role in [UserRole.HOD, UserRole.DEPARTMENT_INCHARGE]:
            if user.department:
                if is_verified_only:
                    qs = qs.filter(department=user.department)
                else:
                    qs = qs.filter(faculty__department=user.department)
                scope_desc = f"Department ({user.department.name})"
            else:
                qs = qs.none()
                scope_desc = "Unassigned Department"
        else:
            scope_desc = "College-Wide"
            if department_code:
                dept = Department.objects.filter(college=college, code__iexact=department_code).first()
                if dept:
                    if is_verified_only:
                        qs = qs.filter(department=dept)
                    else:
                        qs = qs.filter(faculty__department=dept)
                    scope_desc = f"Department ({dept.name})"

        # Category filter
        if category_code:
            cat_q = Q(**{f"{cat_field}__iexact": category_code}) | Q(**{f"{cat_field}__icontains": category_code})
            qs = qs.filter(cat_q)

        # Academic Year filter
        if academic_year_name:
            qs = qs.filter(**{f"{ay_field}__icontains": academic_year_name})

        count = qs.count()

        # Build provenance sources
        sources = []
        for item in qs.select_related()[:10]:
            if is_verified_only:
                sources.append({
                    "type": "EVIDENCE",
                    "id": str(item.id),
                    "title": item.title,
                    "department": item.department.name if item.department else "General",
                    "academic_year": item.academic_year.name if item.academic_year else "N/A",
                    "is_verified": True,
                    "url": f"/evidence/{item.id}"
                })
            else:
                sources.append({
                    "type": "ACTIVITY",
                    "id": str(item.id),
                    "title": item.title,
                    "department": item.faculty.department.name if item.faculty and item.faculty.department else "General",
                    "academic_year": item.academic_year.name if item.academic_year else "N/A",
                    "is_verified": item.status == ActivityStatus.VERIFIED_EVIDENCE,
                    "status": item.status,
                    "url": f"/faculty/activities/{item.id}"
                })

        return {
            "count": count,
            "category": category_code or "All Categories",
            "academic_year": academic_year_name or "All Academic Years",
            "scope": scope_desc,
            "is_verified_only": is_verified_only,
            "sources": sources
        }

    @staticmethod
    def search_evidence(
        college,
        user,
        query: Optional[str] = None,
        department_code: Optional[str] = None,
        academic_year_name: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Searches verified institutional evidence with role-scoped access.
        """
        qs = Evidence.objects.filter(college=college, status='ACTIVE', is_verified=True)

        # Role scoping
        if user.role == UserRole.FACULTY:
            qs = qs.filter(faculty=user)
        elif user.role in [UserRole.HOD, UserRole.DEPARTMENT_INCHARGE]:
            if user.department:
                qs = qs.filter(department=user.department)
            else:
                qs = qs.none()
        elif department_code:
            dept = Department.objects.filter(college=college, code__iexact=department_code).first()
            if dept:
                qs = qs.filter(department=dept)

        if query:
            qs = qs.filter(
                Q(title__icontains=query) |
                Q(description__icontains=query) |
                Q(category__icontains=query) |
                Q(faculty__first_name__icontains=query) |
                Q(faculty__last_name__icontains=query)
            )

        if academic_year_name:
            qs = qs.filter(academic_year__name__icontains=academic_year_name)

        if category:
            qs = qs.filter(category__icontains=category)

        total_matches = qs.count()
        results = list(qs.select_related('faculty', 'department', 'academic_year')[:limit])

        sources = [
            {
                "type": "EVIDENCE",
                "id": str(e.id),
                "evidence_number": f"EV-{str(e.id)[:8].upper()}",
                "title": e.title,
                "faculty": e.faculty.get_full_name(),
                "department": e.department.name if e.department else "General",
                "academic_year": e.academic_year.name if e.academic_year else "N/A",
                "category": e.category,
                "is_verified": True,
                "url": f"/evidence/{e.id}"
            }
            for e in results
        ]

        return {
            "total_matches": total_matches,
            "returned_count": len(sources),
            "sources": sources
        }

    @staticmethod
    def get_metric_status(
        college,
        user,
        criterion_number: Optional[int] = None,
        metric_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Queries NAAC criteria and metrics with mapped evidence status.
        Accessible by IQAC, Management, HOD (department view), and Super Admin.
        """
        if user.role == UserRole.FACULTY:
            raise PermissionDenied("Faculty members cannot view college-wide metric compliance aggregations.")

        qs = Metric.objects.filter(criterion__college=college).select_related('criterion')

        if criterion_number:
            qs = qs.filter(criterion__number=str(criterion_number))
        if metric_number:
            qs = qs.filter(number__iexact=metric_number)

        metrics_data = []
        sources = []

        for m in qs[:15]:
            mappings_qs = EvidenceMapping.objects.filter(
                metric=m,
                status='ACTIVE',
                evidence__is_verified=True
            )
            if user.role in [UserRole.HOD, UserRole.DEPARTMENT_INCHARGE] and user.department:
                mappings_qs = mappings_qs.filter(evidence__department=user.department)

            evidence_count = mappings_qs.count()
            narrative = ComplianceNarrative.objects.filter(
                metric=m,
                college=college
            ).first()

            status_str = "COMPLETE" if evidence_count >= 3 else ("PARTIAL" if evidence_count > 0 else "NO_EVIDENCE")

            metric_entry = {
                "id": str(m.id),
                "code": m.number,
                "criterion": f"Criterion {m.criterion.number}: {m.criterion.title}",
                "title": m.title,
                "evidence_count": evidence_count,
                "status": status_str,
                "has_narrative": bool(narrative and narrative.narrative_text),
                "narrative_status": narrative.status if narrative else "MISSING"
            }
            metrics_data.append(metric_entry)

            sources.append({
                "type": "METRIC",
                "id": str(m.id),
                "code": m.number,
                "title": f"Metric {m.number}: {m.title}",
                "academic_year": "Accreditation Cycle",
                "department": user.department.name if user.department else "College-Wide",
                "is_verified": True,
                "url": f"/criteria/{m.criterion.id}/metrics/{m.id}"
            })

        return {
            "total_metrics_found": len(metrics_data),
            "metrics": metrics_data,
            "sources": sources
        }

    @staticmethod
    def get_gap_analysis(college, user) -> Dict[str, Any]:
        """
        Executes an intelligent gap analysis identifying metrics with missing evidence or pending workflows.
        """
        if user.role == UserRole.FACULTY:
            rejected = Activity.objects.filter(
                college=college,
                faculty=user,
                status__in=[ActivityStatus.RETURNED_TO_FACULTY, ActivityStatus.REJECTED_IQAC]
            )
            drafts = Activity.objects.filter(college=college, faculty=user, status=ActivityStatus.DRAFT)
            return {
                "scope": "Personal Faculty Quality Profile",
                "returned_submissions_count": rejected.count(),
                "draft_submissions_count": drafts.count(),
                "suggestions": [
                    "Revise and resubmit returned activities with required certificates.",
                    "Submit draft activities for Department In-charge verification."
                ],
                "sources": [
                    {
                        "type": "ACTIVITY",
                        "id": str(a.id),
                        "title": a.title,
                        "status": a.status,
                        "academic_year": a.academic_year.name if a.academic_year else "N/A",
                        "department": user.department.name if user.department else "General",
                        "is_verified": False,
                        "url": f"/faculty/activities/{a.id}"
                    }
                    for a in list(rejected[:5]) + list(drafts[:5])
                ]
            }

        if user.role in [UserRole.HOD, UserRole.DEPARTMENT_INCHARGE]:
            dept = user.department
            pending = Activity.objects.filter(
                college=college,
                faculty__department=dept,
                status__in=[ActivityStatus.PENDING_INCHARGE, ActivityStatus.PENDING_HOD]
            ).count()
            unmapped = Evidence.objects.filter(
                college=college,
                department=dept,
                is_verified=True,
                mappings__isnull=True
            ).count()
            return {
                "scope": f"Department ({dept.name if dept else 'General'})",
                "pending_verification_queue": pending,
                "unmapped_evidence_count": unmapped,
                "suggestions": [
                    f"Audit {pending} submissions awaiting verification in your department queue.",
                    f"Map {unmapped} verified evidence records to NAAC criteria metrics."
                ],
                "sources": []
            }

        all_metrics = Metric.objects.filter(criterion__college=college)
        zero_evidence_metrics = []
        for m in all_metrics.select_related('criterion')[:30]:
            ev_count = EvidenceMapping.objects.filter(metric=m, status='ACTIVE', evidence__is_verified=True).count()
            if ev_count == 0:
                zero_evidence_metrics.append({
                    "id": str(m.id),
                    "code": m.number,
                    "title": m.title,
                    "criterion": f"Criterion {m.criterion.number}"
                })

        pending_iqac = Activity.objects.filter(college=college, status=ActivityStatus.PENDING_IQAC).count()

        return {
            "scope": "College-Wide Quality Assurance",
            "zero_evidence_metrics_count": len(zero_evidence_metrics),
            "pending_iqac_verification": pending_iqac,
            "critical_unsupported_metrics": zero_evidence_metrics[:5],
            "suggestions": [
                f"Create Data Requests for {len(zero_evidence_metrics)} metrics currently lacking verified evidence.",
                f"Review {pending_iqac} activities waiting in the Final IQAC Verification Queue."
            ],
            "sources": [
                {
                    "type": "METRIC",
                    "id": m["id"],
                    "code": m["code"],
                    "title": f"Metric {m['code']}: {m['title']}",
                    "academic_year": "Current Cycle",
                    "department": "College-Wide",
                    "is_verified": False,
                    "url": f"/criteria"
                }
                for m in zero_evidence_metrics[:5]
            ]
        }

    @staticmethod
    def get_document_qa(college, user, document_id: str, question: str) -> Dict[str, Any]:
        """
        Answers questions about an uploaded certificate or evidence document.
        Strictly distinguishes extracted facts from interpretations.
        """
        try:
            doc = Document.objects.select_related('activity', 'activity__faculty').get(id=document_id)
        except Document.DoesNotExist:
            return {"error": "Document not found."}

        # Role authorization check
        if user.role == UserRole.FACULTY and doc.activity.faculty != user:
            raise PermissionDenied("You can only inspect documents from your own submissions.")
        elif user.role in [UserRole.HOD, UserRole.DEPARTMENT_INCHARGE]:
            if doc.activity.faculty.department != user.department:
                raise PermissionDenied("You can only inspect documents within your assigned department.")
        elif user.role not in [UserRole.SUPER_ADMIN, UserRole.IQAC, UserRole.COLLEGE_MANAGEMENT]:
            raise PermissionDenied("Unauthorized to inspect document.")

        ai_job = AIProcessingJob.objects.filter(document=doc).first()
        extracted_data = {}
        confidence = 0.0
        doc_type = "Certificate / Proof"

        if ai_job and hasattr(ai_job, 'extraction_result'):
            extracted_data = ai_job.extraction_result.extracted_data
            confidence = float(ai_job.extraction_result.overall_confidence)
            doc_type = ai_job.extraction_result.ai_document_type

        q_lower = question.lower()
        extracted_facts = {}
        if "organizer" in q_lower:
            extracted_facts["organizer"] = extracted_data.get("organizer", doc.activity.organizer or "Not detected")
        if "date" in q_lower or "when" in q_lower:
            extracted_facts["dates"] = f"{doc.activity.start_date} to {doc.activity.end_date}"
        if "duration" in q_lower:
            extracted_facts["duration"] = doc.activity.duration or extracted_data.get("duration", "Not specified")
        if "faculty" in q_lower or "who" in q_lower:
            extracted_facts["faculty"] = doc.activity.faculty.get_full_name()

        if not extracted_facts:
            extracted_facts = {
                "activity_title": doc.activity.title,
                "organizer": doc.activity.organizer or extracted_data.get("organizer", "N/A"),
                "duration": doc.activity.duration,
                "faculty": doc.activity.faculty.get_full_name(),
                "file_name": doc.original_filename,
            }

        return {
            "document_id": str(doc.id),
            "file_name": doc.original_filename,
            "document_type": doc_type,
            "extraction_confidence": confidence,
            "extracted_facts": extracted_facts,
            "interpretation_note": "Factual properties detected directly from document metadata and validated fields.",
            "sources": [{
                "type": "DOCUMENT",
                "id": str(doc.id),
                "title": doc.original_filename,
                "department": doc.activity.faculty.department.name if doc.activity.faculty.department else "General",
                "academic_year": doc.activity.academic_year.name if doc.activity.academic_year else "N/A",
                "is_verified": doc.activity.status == ActivityStatus.VERIFIED_EVIDENCE,
                "url": f"/faculty/activities/{doc.activity.id}"
            }]
        }

    @staticmethod
    def compare_documents(college, user, doc1_id: str, doc2_id: str) -> Dict[str, Any]:
        """
        Compares two authorized documents on key institutional fields.
        """
        doc1 = Document.objects.select_related('activity', 'activity__faculty').filter(id=doc1_id).first()
        doc2 = Document.objects.select_related('activity', 'activity__faculty').filter(id=doc2_id).first()

        if not doc1 or not doc2:
            return {"error": "One or both documents could not be located."}

        for d in [doc1, doc2]:
            if user.role == UserRole.FACULTY and d.activity.faculty != user:
                raise PermissionDenied("You can only compare your own documents.")
            elif user.role in [UserRole.HOD, UserRole.DEPARTMENT_INCHARGE] and d.activity.faculty.department != user.department:
                raise PermissionDenied("You can only compare documents from your department.")

        comparison = {
            "doc1": {
                "id": str(doc1.id),
                "filename": doc1.original_filename,
                "title": doc1.activity.title,
                "organizer": doc1.activity.organizer,
                "faculty": doc1.activity.faculty.get_full_name(),
                "dates": f"{doc1.activity.start_date} to {doc1.activity.end_date}",
            },
            "doc2": {
                "id": str(doc2.id),
                "filename": doc2.original_filename,
                "title": doc2.activity.title,
                "organizer": doc2.activity.organizer,
                "faculty": doc2.activity.faculty.get_full_name(),
                "dates": f"{doc2.activity.start_date} to {doc2.activity.end_date}",
            },
            "matches": [],
            "differences": []
        }

        if doc1.activity.organizer and doc1.activity.organizer == doc2.activity.organizer:
            comparison["matches"].append(f"Same organizer: {doc1.activity.organizer}")
        else:
            comparison["differences"].append(f"Organizers differ ('{doc1.activity.organizer}' vs '{doc2.activity.organizer}')")

        if doc1.activity.faculty == doc2.activity.faculty:
            comparison["matches"].append(f"Same faculty member: {doc1.activity.faculty.get_full_name()}")
        else:
            comparison["differences"].append("Different faculty participants")

        if doc1.activity.start_date == doc2.activity.start_date:
            comparison["matches"].append(f"Same start date: {doc1.activity.start_date}")
        else:
            comparison["differences"].append("Different event dates")

        return comparison

    @staticmethod
    def propose_report_action(college, user, report_type: str, filters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a pending report configuration for user confirmation.
        AI DOES NOT silently generate or download reports.
        """
        return {
            "action_type": "GENERATE_REPORT",
            "title": f"Generate {report_type} Report",
            "summary": f"Generate official quality report of type '{report_type}' with parameters: {filters}",
            "parameters": {
                "report_type": report_type,
                "filters": filters
            },
            "requires_confirmation": True
        }

    @staticmethod
    def propose_create_task(college, user, title: str, description: str, assignee_id: Optional[str] = None, due_date: Optional[str] = None) -> Dict[str, Any]:
        """
        Creates a pending task creation action for user confirmation.
        """
        return {
            "action_type": "CREATE_TASK",
            "title": f"Create Task: {title}",
            "summary": f"Assign task '{title}' to institutional collaborator with due date {due_date or 'Next Week'}.",
            "parameters": {
                "title": title,
                "description": description,
                "assignee_id": assignee_id,
                "due_date": due_date
            },
            "requires_confirmation": True
        }
