"""
AQAR and SSR Compliance Workspace Views — Phase 8
REST APIs for dashboard analytics, gap analysis, data requests, narrative drafting,
source traceability, and department contributions.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from django.db.models import Q

from apps.criteria.models import Section, Metric, Framework
from .models import (
    ComplianceWorkspaceType, ComplianceNarrativeStatus,
    ComplianceNarrative, ComplianceNarrativeVersion,
    DataRequest, DataRequestStatus,
    PreparationChecklistItem
)
from .serializers import (
    SectionSerializer, ComplianceNarrativeSerializer, ComplianceNarrativeVersionSerializer,
    DataRequestSerializer, PreparationChecklistItemSerializer
)
from .services import (
    ComplianceProgressService, EvidenceGapAnalysisService,
    DataRequestWorkflowService, AINarrativeDraftingService,
    SourceTraceabilityService, ContributionAnalysisService
)


class AQARDashboardView(APIView):
    """
    Central AQAR Preparation Workspace Dashboard (Section 3).
    Returns real-time preparation progress, section and criteria breakdown,
    metrics requiring attention, and checklist status.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college

        # Determine academic year
        academic_year_id = request.query_params.get('academic_year')
        if not academic_year_id and college:
            active_ay = college.academic_years.filter(is_current=True).first() or college.academic_years.filter(is_active=True).first()
            academic_year_id = str(active_ay.id) if active_ay else None

        # Determine framework
        framework_id = request.query_params.get('framework')
        if not framework_id and college:
            active_fw = Framework.objects.filter(Q(college=college) | Q(college__isnull=True), is_active=True).first()
            framework_id = str(active_fw.id) if active_fw else None

        # Calculate progress
        data = ComplianceProgressService.calculate_preparation_completeness(
            college=college,
            workspace_type='AQAR',
            academic_year_id=academic_year_id,
            framework_id=framework_id
        )

        # Context details
        active_ay_obj = college.academic_years.filter(id=academic_year_id).first() if (college and academic_year_id) else None
        active_fw_obj = Framework.objects.filter(id=framework_id).first() if framework_id else None

        # Checklist summary
        checklist_items = PreparationChecklistItem.objects.filter(
            college=college,
            workspace_type='AQAR'
        )
        if academic_year_id:
            checklist_items = checklist_items.filter(academic_year_id=academic_year_id)

        cl_total = checklist_items.count()
        cl_completed = checklist_items.filter(status='COMPLETED').count()
        cl_pct = round((cl_completed / cl_total) * 100, 1) if cl_total > 0 else 0.0

        # Open Data Requests count
        open_requests_count = DataRequest.objects.filter(
            college=college,
            workspace_type='AQAR',
            status__in=['OPEN', 'IN_PROGRESS', 'SUBMITTED']
        ).count()

        # Narrative draft statuses
        narrative_counts = {
            'draft': ComplianceNarrative.objects.filter(college=college, workspace_type='AQAR', status='DRAFT').count(),
            'ready_for_review': ComplianceNarrative.objects.filter(college=college, workspace_type='AQAR', status='READY_FOR_REVIEW').count(),
            'approved': ComplianceNarrative.objects.filter(college=college, workspace_type='AQAR', status='APPROVED').count(),
        }

        return Response({
            'workspace': 'AQAR',
            'overall_progress': data.get('overall_completeness_percentage', 0.0),
            'academic_year': {
                'id': str(active_ay_obj.id) if active_ay_obj else None,
                'name': active_ay_obj.name if active_ay_obj else 'All Academic Years',
            },
            'framework': {
                'id': str(active_fw_obj.id) if active_fw_obj else None,
                'name': active_fw_obj.name if active_fw_obj else 'Standard Framework',
                'version': active_fw_obj.version if active_fw_obj else '2026',
            },
            'progress': data,
            'checklist_summary': {
                'total_tasks': cl_total,
                'completed_tasks': cl_completed,
                'completion_percentage': cl_pct,
            },
            'open_data_requests_count': open_requests_count,
            'narrative_counts': narrative_counts,
        })


class AQARSectionsView(APIView):
    """
    Section-level breakdown of the active accreditation framework (Section 5).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college
        framework_id = request.query_params.get('framework')

        sections_qs = Section.objects.filter(is_active=True)
        if college:
            sections_qs = sections_qs.filter(Q(college=college) | Q(college__isnull=True))
        if framework_id:
            sections_qs = sections_qs.filter(framework_ref_id=framework_id)

        serializer = SectionSerializer(sections_qs.order_by('display_order', 'name'), many=True)
        return Response(serializer.data)


class EvidenceGapAnalysisView(APIView):
    """
    Evidence Gap Analysis API (Section 10).
    Surfaces available vs missing evidence and required documentation per metric.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        college = request.user.college
        academic_year_id = request.query_params.get('academic_year')
        criterion_id = request.query_params.get('criterion')

        gaps = EvidenceGapAnalysisService.get_gap_analysis(
            college=college,
            academic_year_id=academic_year_id,
            criterion_id=criterion_id
        )
        return Response(gaps)


class DepartmentContributionsView(APIView):
    """
    Institutional Department Contribution Leaderboard (Section 12).
    Management has monitoring-only access.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        college = request.user.college
        academic_year_id = request.query_params.get('academic_year')

        results = ContributionAnalysisService.get_department_contributions(
            college=college,
            academic_year_id=academic_year_id
        )
        return Response(results)


class FacultyContributionsView(APIView):
    """
    Faculty Contribution Breakdown with strict Role-Based Scoping (Section 13).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        academic_year_id = request.query_params.get('academic_year')
        results = ContributionAnalysisService.get_faculty_contributions(
            user=request.user,
            academic_year_id=academic_year_id
        )
        return Response(results)


class SourceTraceabilityView(APIView):
    """
    Source Traceability API (Section 16).
    Returns all verified activities, certificates, checksums, and audit logs backing a metric.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        metric_id = request.query_params.get('metric')
        if not metric_id:
            raise ValidationError({'metric': 'Metric ID is required.'})

        academic_year_id = request.query_params.get('academic_year')
        result = SourceTraceabilityService.get_metric_traceability(
            metric_id=metric_id,
            college=request.user.college,
            academic_year_id=academic_year_id
        )
        return Response(result)


class ComplianceNarrativeViewSet(viewsets.ModelViewSet):
    """
    Narrative Response Workspace (Sections 14, 15, 17, 18).
    Supports manual editing, AI drafting, version history, and review transitions.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ComplianceNarrativeSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ComplianceNarrative.objects.filter(college=user.college)
        workspace = self.request.query_params.get('workspace')
        if workspace:
            qs = qs.filter(workspace_type=workspace)
        metric_id = self.request.query_params.get('metric')
        if metric_id:
            qs = qs.filter(metric_id=metric_id)
        return qs.select_related('metric', 'author', 'approved_by').prefetch_related('versions', 'source_evidence')

    def perform_create(self, serializer):
        serializer.save(
            college=self.request.user.college,
            author=self.request.user,
            version=1
        )

    def perform_update(self, serializer):
        narrative = self.get_object()
        # Save snapshot into version history before updating
        ComplianceNarrativeVersion.objects.create(
            narrative=narrative,
            version_number=narrative.version,
            narrative_text=narrative.narrative_text,
            status=narrative.status,
            edited_by=self.request.user,
            change_reason=self.request.data.get('change_reason', 'Manual edit')
        )
        serializer.save(
            version=narrative.version + 1,
            author=self.request.user
        )

    @action(detail=False, methods=['post'], url_path='ai-draft')
    def ai_draft(self, request):
        """
        AI-Assisted narrative drafting grounded exclusively in verified institutional data.
        """
        metric_id = request.data.get('metric_id')
        if not metric_id:
            raise ValidationError({'metric_id': 'metric_id is required.'})

        academic_year_id = request.data.get('academic_year_id')
        workspace_type = request.data.get('workspace_type', 'AQAR')

        result = AINarrativeDraftingService.generate_draft(
            user=request.user,
            metric_id=metric_id,
            academic_year_id=academic_year_id,
            workspace_type=workspace_type
        )
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='transition-status')
    def transition_status(self, request, pk=None):
        """
        Review workflow state transitions: DRAFT -> READY_FOR_REVIEW -> APPROVED -> LOCKED.
        Only IQAC and Super Admin can approve or lock narratives!
        """
        user = request.user
        narrative = self.get_object()
        new_status = request.data.get('status')

        if new_status in ['APPROVED', 'LOCKED']:
            if user.role not in ['SUPER_ADMIN', 'IQAC']:
                raise PermissionDenied("Only IQAC Coordinators can officially approve or lock compliance narratives.")

        if new_status not in [c[0] for c in ComplianceNarrativeStatus.choices]:
            raise ValidationError({'status': 'Invalid narrative status.'})

        narrative.status = new_status
        if new_status == 'APPROVED':
            narrative.approved_by = user
            narrative.approved_at = timezone.now()
        narrative.review_comments = request.data.get('review_comments', narrative.review_comments)
        narrative.save()

        # Record version state
        ComplianceNarrativeVersion.objects.create(
            narrative=narrative,
            version_number=narrative.version,
            narrative_text=narrative.narrative_text,
            status=new_status,
            edited_by=user,
            change_reason=f"Status transitioned to {new_status}"
        )

        return Response(ComplianceNarrativeSerializer(narrative).data)


class DataRequestViewSet(viewsets.ModelViewSet):
    """
    Data Request Workflow ViewSet (Section 11).
    Lifecycle: IQAC creates -> Department/Faculty submits -> IQAC verifies & auto-maps.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DataRequestSerializer

    def get_queryset(self):
        user = self.request.user
        qs = DataRequest.objects.filter(college=user.college)

        # Scoping by role
        if user.role == 'FACULTY':
            if user.department:
                qs = qs.filter(Q(assigned_to=user) | Q(department=user.department))
            else:
                qs = qs.filter(assigned_to=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            qs = qs.filter(department=user.department)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        metric_param = self.request.query_params.get('metric')
        if metric_param:
            qs = qs.filter(metric_id=metric_param)

        return qs.select_related('metric', 'department', 'assigned_to', 'requested_by', 'response_evidence')

    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role not in ['SUPER_ADMIN', 'IQAC']:
            raise PermissionDenied("Only IQAC Coordinators can create official Data Requests.")

        data = request.data
        data_req = DataRequestWorkflowService.create_request(
            user=user,
            metric_id=data.get('metric'),
            title=data.get('title'),
            description=data.get('description', ''),
            academic_year_id=data.get('academic_year'),
            department_id=data.get('department'),
            assigned_to_id=data.get('assigned_to'),
            due_date=data.get('due_date'),
            priority=data.get('priority', 'MEDIUM'),
            workspace_type=data.get('workspace_type', 'AQAR')
        )
        return Response(DataRequestSerializer(data_req).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_response(self, request, pk=None):
        evidence_id = request.data.get('evidence_id')
        notes = request.data.get('notes') or request.data.get('submission_notes', '')
        req = DataRequestWorkflowService.submit_response(
            user=request.user,
            request_id=pk,
            evidence_id=evidence_id,
            submission_notes=notes
        )
        return Response(DataRequestSerializer(req).data)

    @action(detail=True, methods=['post'], url_path='review')
    def review_response(self, request, pk=None):
        decision = request.data.get('decision') or request.data.get('action')
        reason = request.data.get('reason') or request.data.get('feedback', '')
        req = DataRequestWorkflowService.review_request(
            user=request.user,
            request_id=pk,
            decision=decision,
            rejection_reason=reason
        )
        return Response(DataRequestSerializer(req).data)


class PreparationChecklistViewSet(viewsets.ModelViewSet):
    """
    Preparation Tasks and Checklist (Sections 22 & 23).
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PreparationChecklistItemSerializer

    def get_queryset(self):
        user = self.request.user
        qs = PreparationChecklistItem.objects.filter(college=user.college)
        workspace = self.request.query_params.get('workspace')
        if workspace:
            qs = qs.filter(workspace_type=workspace)
        return qs.select_related('owner', 'department', 'metric', 'completed_by')

    @action(detail=True, methods=['post'], url_path='toggle')
    def toggle_task(self, request, pk=None):
        item = self.get_object()
        if item.status == 'COMPLETED':
            item.status = 'PENDING'
            item.completed_at = None
            item.completed_by = None
        else:
            item.status = 'COMPLETED'
            item.completed_at = timezone.now()
            item.completed_by = request.user
        item.save()
        return Response(PreparationChecklistItemSerializer(item).data)
