"""
SSR Compliance Workspace Views — Phase 8
Dedicated Self Study Report (SSR) preparation, multi-criteria assessment,
and review history tracking.
"""
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q, Count

from apps.criteria.models import Framework, Criterion, Metric, EvidenceMapping
from apps.aqar.models import ComplianceNarrative, ComplianceNarrativeVersion, ComplianceWorkspaceType
from apps.aqar.services import ComplianceProgressService


class SSRDashboardView(APIView):
    """
    SSR Preparation Workspace Dashboard (Section 4).
    Multi-criteria readiness, narrative completion status, and cycle management.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college

        framework_id = request.query_params.get('framework')
        if not framework_id and college:
            active_fw = Framework.objects.filter(Q(college=college) | Q(college__isnull=True), is_active=True).first()
            framework_id = str(active_fw.id) if active_fw else None

        active_fw_obj = Framework.objects.filter(id=framework_id).first() if framework_id else None

        # Calculate SSR completeness (across all academic years in cycle)
        data = ComplianceProgressService.calculate_preparation_completeness(
            college=college,
            workspace_type='SSR',
            academic_year_id=None,
            framework_id=framework_id
        )

        # Narrative readiness breakdown
        narratives = ComplianceNarrative.objects.filter(
            college=college,
            workspace_type='SSR'
        )
        total_narratives = narratives.count()
        approved_narratives = narratives.filter(status='APPROVED').count()
        under_review = narratives.filter(status='READY_FOR_REVIEW').count()
        draft_narratives = narratives.filter(status='DRAFT').count()

        # Metrics with approved narrative vs missing narrative
        total_metrics = data['total_metrics']
        narrative_readiness_pct = (
            round((approved_narratives / total_metrics) * 100, 1)
            if total_metrics > 0 else 0.0
        )

        cycle_years = [ay.name for ay in college.academic_years.filter(is_active=True).order_by('-name')[:5]] if college else []

        return Response({
            'workspace': 'SSR',
            'overall_progress': data.get('overall_completeness_percentage', 0.0),
            'cycle': 'Institutional Accreditation Cycle (5-Year SSR)',
            'cycle_years': cycle_years,
            'framework': {
                'id': str(active_fw_obj.id) if active_fw_obj else None,
                'name': active_fw_obj.name if active_fw_obj else 'NAAC SSR Framework',
                'version': active_fw_obj.version if active_fw_obj else '2026',
            },
            'progress': data,
            'narrative_readiness': {
                'total_metrics': total_metrics,
                'approved_narratives': approved_narratives,
                'under_review': under_review,
                'draft_narratives': draft_narratives,
                'missing_narratives': max(total_metrics - (approved_narratives + under_review + draft_narratives), 0),
                'readiness_percentage': narrative_readiness_pct,
            },
        })


class SSRReviewHistoryView(APIView):
    """
    Review history and revision log for SSR Narratives and documentation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        college = request.user.college
        metric_id = request.query_params.get('metric')

        history_qs = ComplianceNarrativeVersion.objects.filter(
            narrative__college=college,
            narrative__workspace_type='SSR'
        )
        if metric_id:
            history_qs = history_qs.filter(narrative__metric_id=metric_id)

        history = [
            {
                'id': str(h.id),
                'metric_number': h.narrative.metric.number,
                'metric_title': h.narrative.metric.title,
                'version_number': h.version_number,
                'status': h.status,
                'edited_by': h.edited_by.get_full_name() if h.edited_by else 'System',
                'change_reason': h.change_reason,
                'created_at': h.created_at.isoformat(),
            }
            for h in history_qs.select_related('narrative', 'narrative__metric', 'edited_by')[:50]
        ]
        return Response(history)
