"""
Phase 8 Automated Unit Tests — AQAR / SSR Intelligence & Compliance Workspace
Tests framework sections, completeness scoring, gap analysis, data requests,
narrative version control, AI narrative drafting with verified data grounding,
source traceability, role-based access control, and tenant isolation.
"""
import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.colleges.models import College
from apps.accounts.models import User, UserRole
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityCategory, ActivityType, ActivityStatus, Document
from apps.evidence.models import Evidence
from apps.criteria.models import (
    Framework, Section, Criterion, Metric,
    EvidenceRequirement, EvidenceMapping, MetricDataRequirement,
    DataRequirementType, CalculationSourceType
)
from apps.aqar.models import (
    ComplianceWorkspaceType, ComplianceNarrativeStatus,
    ComplianceNarrative, ComplianceNarrativeVersion,
    DataRequest, DataRequestStatus, DataRequestPriority,
    PreparationChecklistItem, TaskStatus
)
from apps.aqar.services import (
    ComplianceProgressService, EvidenceGapAnalysisService,
    DataRequestWorkflowService, AINarrativeDraftingService,
    SourceTraceabilityService
)


class Phase8ComplianceWorkspaceTests(TestCase):
    """
    Comprehensive test suite for Phase 8.
    """

    def setUp(self):
        # 1. Colleges
        self.college_a = College.objects.create(name="Primary College A", code="COL-A", is_active=True)
        self.college_b = College.objects.create(name="Isolated College B", code="COL-B", is_active=True)

        # 2. Academic Year
        self.ay = AcademicYear.objects.create(
            college=self.college_a,
            name="2024-25",
            start_date=datetime.date(2024, 6, 1),
            end_date=datetime.date(2025, 5, 31),
            is_active=True
        )

        # 3. Department
        self.dept_cse = Department.objects.create(college=self.college_a, name="Computer Science", code="CSE", is_active=True)
        self.dept_ece = Department.objects.create(college=self.college_a, name="Electronics", code="ECE", is_active=True)

        # 4. Users
        self.super_admin = User.objects.create_user(email="admin@test.com", password="password123", role=UserRole.SUPER_ADMIN)
        self.management = User.objects.create_user(email="mgmt@test.com", password="password123", role=UserRole.COLLEGE_MANAGEMENT, college=self.college_a)
        self.iqac = User.objects.create_user(email="iqac@test.com", password="password123", role=UserRole.IQAC, college=self.college_a)
        self.hod_cse = User.objects.create_user(email="hod@test.com", password="password123", role=UserRole.HOD, college=self.college_a, department=self.dept_cse)
        self.faculty_cse = User.objects.create_user(email="faculty@test.com", password="password123", role=UserRole.FACULTY, college=self.college_a, department=self.dept_cse)
        self.faculty_b = User.objects.create_user(email="faculty_b@test.com", password="password123", role=UserRole.FACULTY, college=self.college_b)

        # 5. Framework, Section, Criterion, Metric
        self.framework = Framework.objects.create(college=self.college_a, name="NAAC 2026", code="NAAC_2026", version="2026.1", is_active=True)
        self.section = Section.objects.create(college=self.college_a, framework_ref=self.framework, name="Part B: Criteria", code="PART_B", display_order=1)
        self.criterion = Criterion.objects.create(college=self.college_a, framework="NAAC_2026", framework_ref=self.framework, section=self.section, number="2", title="Teaching-Learning", weightage=350, display_order=2)
        self.metric_1 = Metric.objects.create(college=self.college_a, criterion=self.criterion, number="2.4.2", title="Faculty FDP Training", weightage=50, benchmark_count=2, display_order=1)
        self.metric_2 = Metric.objects.create(college=self.college_a, criterion=self.criterion, number="2.4.3", title="Teaching Experience", weightage=30, benchmark_count=5, display_order=2)

        # 6. Categories & Activities
        self.cat_fdp = ActivityCategory.objects.create(college=self.college_a, name="FDP", code="FDP", is_active=True)

        self.activity_verified = Activity.objects.create(
            college=self.college_a,
            faculty=self.faculty_cse,
            department=self.dept_cse,
            academic_year=self.ay,
            category=self.cat_fdp,
            activity_type=ActivityType.FDP,
            title="Advanced AI Pedagogy FDP",
            start_date=datetime.date(2024, 7, 10),
            end_date=datetime.date(2024, 7, 15),
            duration="5 Days",
            duration_days=5,
            status=ActivityStatus.VERIFIED_EVIDENCE
        )
        self.doc_verified = Document.objects.create(
            activity=self.activity_verified,
            college=self.college_a,
            uploaded_by=self.faculty_cse,
            file_name="AI_Pedagogy_Certificate.pdf",
            file_size=2048,
            file_hash="abc123hash",
            is_primary=True,
            status="ACTIVE"
        )
        self.evidence_verified = Evidence.objects.create(
            college=self.college_a,
            activity=self.activity_verified,
            faculty=self.faculty_cse,
            department=self.dept_cse,
            academic_year=self.ay,
            document=self.doc_verified,
            title="Advanced AI Pedagogy FDP",
            category="FDP",
            is_verified=True,
            verified_at=timezone.now(),
            status="ACTIVE"
        )

        # Evidence Mapping for Metric 1 (1 mapped out of 2 benchmark -> Partial)
        self.mapping = EvidenceMapping.objects.create(
            college=self.college_a,
            criterion=self.criterion,
            metric=self.metric_1,
            evidence=self.evidence_verified,
            academic_year=self.ay,
            mapped_by=self.iqac,
            status='ACTIVE'
        )

        self.client = APIClient()

    def test_section_criterion_hierarchy(self):
        """Validates Framework -> Section -> Criterion -> Metric relationships."""
        self.assertEqual(self.criterion.section, self.section)
        self.assertEqual(self.section.criteria.count(), 1)
        self.assertEqual(self.section.framework_ref, self.framework)
        self.assertEqual(self.metric_1.criterion, self.criterion)

    def test_aqar_completeness_calculation(self):
        """
        Verifies transparent calculation formula:
        Metric 1: 1 evidence mapped / benchmark 2 -> Partial (0.5 score)
        Metric 2: 0 evidence mapped / benchmark 5 -> Missing (0.0 score)
        Total Metrics = 2, Total Score = 0.5 -> Overall = (0.5 / 2) * 100 = 25.0%
        """
        progress = ComplianceProgressService.calculate_preparation_completeness(
            college=self.college_a,
            workspace_type='AQAR',
            academic_year_id=str(self.ay.id),
            framework_id=str(self.framework.id)
        )
        self.assertEqual(progress['total_metrics'], 2)
        self.assertEqual(progress['completed_metrics_count'], 0)
        self.assertEqual(progress['partial_metrics_count'], 1)
        self.assertEqual(progress['missing_metrics_count'], 1)
        self.assertEqual(progress['overall_completeness_percentage'], 25.0)
        self.assertEqual(progress['total_evidence_mapped'], 1)

    def test_evidence_gap_analysis(self):
        """Verifies Gap Analysis correctly flags Metric 1 as PARTIAL and Metric 2 as MISSING."""
        gaps = EvidenceGapAnalysisService.get_gap_analysis(
            college=self.college_a,
            academic_year_id=str(self.ay.id)
        )
        self.assertEqual(len(gaps), 2)
        m1_gap = next(g for g in gaps if g['metric_number'] == '2.4.2')
        self.assertEqual(m1_gap['status'], 'PARTIAL')
        self.assertEqual(m1_gap['evidence_available_count'], 1)
        self.assertIn("Computer Science", m1_gap['contributing_departments'])

        m2_gap = next(g for g in gaps if g['metric_number'] == '2.4.3')
        self.assertEqual(m2_gap['status'], 'MISSING')
        self.assertEqual(m2_gap['evidence_available_count'], 0)

    def test_data_request_lifecycle_and_auto_mapping(self):
        """
        Tests the complete Data Request lifecycle:
        1. IQAC creates request
        2. Department In-charge/Faculty submits response with evidence
        3. IQAC reviews and verifies -> auto-creates EvidenceMapping!
        """
        # 1. Create request
        req = DataRequestWorkflowService.create_request(
            user=self.iqac,
            metric_id=str(self.metric_2.id),
            title="Provide 5 Teaching Experience Proofs",
            description="Urgent for Criterion 2 preparation",
            academic_year_id=str(self.ay.id),
            department_id=str(self.dept_cse.id),
            assigned_to_id=str(self.faculty_cse.id),
            priority='HIGH'
        )
        self.assertEqual(req.status, DataRequestStatus.OPEN)

        # 2. Submit response
        req_sub = DataRequestWorkflowService.submit_response(
            user=self.faculty_cse,
            request_id=str(req.id),
            evidence_id=str(self.evidence_verified.id),
            submission_notes="Attached verified certificate"
        )
        self.assertEqual(req_sub.status, DataRequestStatus.SUBMITTED)

        # 3. IQAC reviews and verifies
        initial_mappings = EvidenceMapping.objects.filter(metric=self.metric_2, status='ACTIVE').count()
        self.assertEqual(initial_mappings, 0)

        req_rev = DataRequestWorkflowService.review_request(
            user=self.iqac,
            request_id=str(req.id),
            decision='VERIFIED'
        )
        self.assertEqual(req_rev.status, DataRequestStatus.VERIFIED)

        # Verify automatic EvidenceMapping creation!
        new_mappings = EvidenceMapping.objects.filter(metric=self.metric_2, status='ACTIVE').count()
        self.assertEqual(new_mappings, 1)

    def test_narrative_version_control(self):
        """Verifies narrative editing preserves prior revision snapshots in version table."""
        self.client.force_authenticate(user=self.iqac)
        # Create initial narrative
        narrative = ComplianceNarrative.objects.create(
            college=self.college_a,
            workspace_type=ComplianceWorkspaceType.AQAR,
            academic_year=self.ay,
            metric=self.metric_1,
            narrative_text="Initial Draft Text v1",
            status=ComplianceNarrativeStatus.DRAFT,
            author=self.iqac,
            version=1
        )

        # Update narrative via API
        update_url = f"/api/compliance/narratives/{narrative.id}/"
        resp = self.client.patch(update_url, {
            'narrative_text': 'Updated Qualitative Response v2',
            'change_reason': 'Refined language based on HOD inputs'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        narrative.refresh_from_db()
        self.assertEqual(narrative.version, 2)
        self.assertEqual(narrative.narrative_text, 'Updated Qualitative Response v2')

        # Check version history preserved
        versions = narrative.versions.all()
        self.assertEqual(versions.count(), 1)
        self.assertEqual(versions.first().version_number, 1)
        self.assertEqual(versions.first().narrative_text, "Initial Draft Text v1")

    def test_ai_narrative_drafting_grounded_in_verified_data(self):
        """
        AI must synthesize narrative strictly grounded in verified evidence,
        tag output as AI-drafted, and cite source evidence records.
        """
        result = AINarrativeDraftingService.generate_draft(
            user=self.iqac,
            metric_id=str(self.metric_1.id),
            academic_year_id=str(self.ay.id),
            workspace_type='AQAR'
        )
        self.assertTrue(result['is_ai_drafted'])
        self.assertEqual(result['status'], 'DRAFT')
        self.assertIn("review required", result['notice'].lower())
        self.assertEqual(result['source_evidence_count'], 1)

        # Verify ComplianceNarrative created and linked to evidence
        narrative = ComplianceNarrative.objects.get(id=result['narrative_id'])
        self.assertTrue(narrative.is_ai_drafted)
        self.assertIn(self.evidence_verified, narrative.source_evidence.all())

    def test_management_cannot_approve_or_verify(self):
        """
        CRITICAL GOVERNANCE RULE:
        College Management has monitoring-only access.
        Management cannot approve narratives or review data requests.
        """
        self.client.force_authenticate(user=self.management)
        narrative = ComplianceNarrative.objects.create(
            college=self.college_a,
            workspace_type=ComplianceWorkspaceType.AQAR,
            academic_year=self.ay,
            metric=self.metric_1,
            narrative_text="Sample text",
            status=ComplianceNarrativeStatus.READY_FOR_REVIEW,
            author=self.iqac
        )

        # Management attempts to approve narrative -> HTTP 403 Forbidden
        url = f"/api/compliance/narratives/{narrative.id}/transition-status/"
        resp = self.client.post(url, {'status': 'APPROVED'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # Management attempts to review data request -> HTTP 403 Forbidden
        req = DataRequest.objects.create(
            college=self.college_a,
            metric=self.metric_1,
            academic_year=self.ay,
            requested_by=self.iqac,
            title="Test request",
            description="desc"
        )
        req_url = f"/api/compliance/data-requests/{req.id}/review/"
        resp_req = self.client.post(req_url, {'decision': 'VERIFIED'})
        self.assertEqual(resp_req.status_code, status.HTTP_403_FORBIDDEN)

    def test_source_traceability_returns_full_lineage(self):
        """Source Traceability must return complete audit lineage back to activity, document, and faculty."""
        trace = SourceTraceabilityService.get_metric_traceability(
            metric_id=str(self.metric_1.id),
            college=self.college_a,
            academic_year_id=str(self.ay.id)
        )
        self.assertEqual(trace['total_sources_count'], 1)
        src = trace['sources'][0]
        self.assertEqual(src['evidence']['title'], "Advanced AI Pedagogy FDP")
        self.assertEqual(src['faculty']['name'], self.faculty_cse.get_full_name())
        self.assertEqual(src['document']['file_name'], "AI_Pedagogy_Certificate.pdf")
        self.assertEqual(src['document']['file_hash'], "abc123hash")

    def test_tenant_isolation_cross_college(self):
        """Ensures College B users cannot view College A's AQAR workspace or data requests."""
        self.client.force_authenticate(user=self.faculty_b)
        # Dashboard query for College B returns only College B data
        resp = self.client.get("/api/aqar/dashboard/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # College B has 0 metrics
        self.assertEqual(resp.data['progress']['total_metrics'], 0)

        # Querying College A data requests returns empty queryset
        resp_req = self.client.get("/api/compliance/data-requests/")
        self.assertEqual(resp_req.status_code, status.HTTP_200_OK)
        results = resp_req.data.get('results', resp_req.data)
        self.assertEqual(len(results), 0)

    def test_preparation_checklist_toggle(self):
        """Checklist items toggle between PENDING and COMPLETED with audit user."""
        item = PreparationChecklistItem.objects.create(
            college=self.college_a,
            workspace_type=ComplianceWorkspaceType.AQAR,
            academic_year=self.ay,
            title="Complete faculty roster verification",
            status=TaskStatus.PENDING
        )
        self.client.force_authenticate(user=self.iqac)
        resp = self.client.post(f"/api/aqar/checklist/{item.id}/toggle/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'COMPLETED')
        self.assertEqual(resp.data['completed_by_name'], self.iqac.get_full_name())
