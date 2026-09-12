"""
Analytics Views — Phase 9: Advanced Analytics & Executive Intelligence
REST endpoints for Executive KPIs, IQAC Intelligence, Academic Year Comparison,
Department Benchmarking, Faculty Participation, Evidence Health, Verification Pipeline,
Evidence Gap Matrix, Data Quality Scanner, AI Insights, and Forecasting.
"""
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Count

from apps.accounts.models import User
from apps.departments.models import Department
from apps.activities.models import Activity, ActivityStatus
from apps.academic_years.models import AcademicYear
from apps.criteria.models import Framework
from apps.audit.utils import log_action

from .models import AIExecutiveInsight, ExecutiveSnapshot
from .serializers import AIExecutiveInsightSerializer, ExecutiveSnapshotSerializer
from .services import (
    AnalyticsService,
    EvidenceAnalyticsService,
    FacultyAnalyticsService,
    DepartmentAnalyticsService,
    VerificationPipelineAnalyticsService,
    AcademicYearComparisonService,
    EvidenceGapMatrixService,
    DataQualityService,
    PreparationRiskService,
    ForecastingService,
    AIInsightEngine,
)


class AnalyticsOverviewView(APIView):
    """
    Preserved overview endpoint from earlier phases for backward compatibility.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college

        users_qs = User.objects.all()
        activities_qs = Activity.objects.all()
        dept_qs = Department.objects.all()

        if user.role != 'SUPER_ADMIN':
            if college:
                users_qs = users_qs.filter(college=college)
                activities_qs = activities_qs.filter(college=college)
                dept_qs = dept_qs.filter(college=college)
            else:
                users_qs = users_qs.none()
                activities_qs = activities_qs.none()
                dept_qs = dept_qs.none()

        if user.role in ['HOD', 'DEPARTMENT_INCHARGE'] and user.department:
            activities_qs = activities_qs.filter(department=user.department)
            users_qs = users_qs.filter(department=user.department)
        elif user.role == 'FACULTY':
            activities_qs = activities_qs.filter(faculty=user)

        total_faculty = users_qs.filter(role='FACULTY').count()
        total_activities = activities_qs.count()
        total_departments = dept_qs.count()

        status_counts = activities_qs.values('status').annotate(count=Count('id'))
        status_map = {item['status']: item['count'] for item in status_counts}
        type_counts = activities_qs.values('activity_type').annotate(count=Count('id'))

        return Response({
            'total_faculty': total_faculty,
            'total_activities': total_activities,
            'total_departments': total_departments,
            'status_summary': {
                'draft': status_map.get(ActivityStatus.DRAFT, 0),
                'pending_incharge': status_map.get(ActivityStatus.PENDING_INCHARGE, 0),
                'incharge_verified': status_map.get(ActivityStatus.INCHARGE_VERIFIED, 0),
                'pending_hod': status_map.get(ActivityStatus.PENDING_HOD, 0),
                'hod_approved': status_map.get(ActivityStatus.HOD_APPROVED, 0),
                'pending_iqac': status_map.get(ActivityStatus.PENDING_IQAC, 0),
                'verified_evidence': status_map.get(ActivityStatus.VERIFIED_EVIDENCE, 0) + status_map.get(ActivityStatus.IQAC_VERIFIED, 0),
                'rejected': (
                    status_map.get(ActivityStatus.REJECTED_INCHARGE, 0) +
                    status_map.get(ActivityStatus.REJECTED_HOD, 0) +
                    status_map.get(ActivityStatus.REJECTED_IQAC, 0)
                ),
            },
            'activity_types': list(type_counts),
        })


class ExecutiveAnalyticsView(APIView):
    """
    Executive Management Dashboard Analytics (Section 3).
    High-level institutional KPIs, evidence trajectory, preparation status, risk indicators, and deadlines.
    Accessible to College Management, IQAC, and Super Admin.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college
        if not college and user.role == 'SUPER_ADMIN':
            college_id = request.query_params.get('college')
            from apps.colleges.models import College
            college = College.objects.filter(id=college_id).first() or College.objects.first()

        ay_id = request.query_params.get('academic_year')
        summary = AnalyticsService.get_executive_summary(college, ay_id)

        # Department highlights (top 5 by contribution)
        dept_benchmarks = DepartmentAnalyticsService.get_department_comparison(college, ay_id)
        sorted_depts = sorted(dept_benchmarks, key=lambda x: x['verified_evidence'], reverse=True)[:5]

        # Recent insights
        recent_insights = AIExecutiveInsight.objects.filter(college=college, is_active=True)[:3]
        insights_data = AIExecutiveInsightSerializer(recent_insights, many=True).data

        # Evidence distribution
        verified_count = summary['kpis']['verified_evidence']
        pending_count = summary['kpis']['pending_evidence']
        health_data = EvidenceAnalyticsService.get_evidence_health(college, ay_id)
        unmapped_count = health_data.get('unmapped_evidence_count', 0)

        # Growth trend preview
        comparison = AcademicYearComparisonService.get_academic_year_comparison(college)
        growth_preview = {
            'previous_year': comparison[-2]['verified_evidence_count'] if len(comparison) >= 2 else 0,
            'current_year': comparison[-1]['verified_evidence_count'] if comparison else verified_count,
            'growth_rate_pct': summary['kpis'].get('evidence_growth_pct', 0.0) or 0.0,
        }

        return Response({
            'kpis': summary['kpis'],
            'forecast': summary['forecast'],
            'risk_summary': summary['risk_summary'],
            'preparation_risk': summary['risk_summary'],
            'data_quality_summary': summary['quality_summary'],
            'evidence_distribution': {
                'verified': verified_count,
                'pending': pending_count,
                'unmapped': unmapped_count,
            },
            'growth_trend_preview': growth_preview,
            'department_highlights': sorted_depts,
            'top_contributing_departments': sorted_depts,
            'executive_insights': insights_data,
            'active_ai_insights': insights_data,
            'is_monitoring_only': user.role == 'COLLEGE_MANAGEMENT',
        })


class IQACIntelligenceView(APIView):
    """
    IQAC Operational Intelligence Command Center (Section 4).
    Full verification workload, pipeline stages, bottlenecks, gap summary, and AI insights.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college
        if not college and user.role == 'SUPER_ADMIN':
            from apps.colleges.models import College
            college = College.objects.first()

        ay_id = request.query_params.get('academic_year')
        dept_id = request.query_params.get('department')

        pipeline = VerificationPipelineAnalyticsService.get_pipeline_analytics(college, dept_id)
        evidence_health = EvidenceAnalyticsService.get_evidence_health(college, ay_id)
        quality = DataQualityService.scan_data_quality(college)
        risk = PreparationRiskService.calculate_preparation_risk(college, ay_id)
        forecast = ForecastingService.forecast_preparation(college, ay_id)

        insights = AIExecutiveInsight.objects.filter(college=college, is_active=True)
        insights_data = AIExecutiveInsightSerializer(insights, many=True).data

        return Response({
            'verification_pipeline': pipeline,
            'evidence_health': evidence_health,
            'data_quality': quality,
            'preparation_risk': risk,
            'forecast': forecast,
            'ai_insights': insights_data,
        })


class AcademicYearComparisonView(APIView):
    """
    Multi-Academic Year Comparison (Section 5).
    Side-by-side analysis of activities, verified evidence, faculty participation, and growth.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college
        dept_id = request.query_params.get('department')

        if user.role in ['HOD', 'DEPARTMENT_INCHARGE'] and user.department:
            dept_id = str(user.department.id)

        data = AcademicYearComparisonService.get_academic_year_comparison(college, dept_id)
        return Response(data)


class DepartmentComparisonView(APIView):
    """
    Department Benchmarking & Performance Comparison (Section 6).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college
        ay_id = request.query_params.get('academic_year')

        data = DepartmentAnalyticsService.get_department_comparison(college, ay_id)
        return Response(data)


class FacultyParticipationView(APIView):
    """
    Faculty Participation & Output Analytics (Section 7).
    Enforces strict role scoping: Faculty sees strictly own output.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college
        dept_id = request.query_params.get('department')
        ay_id = request.query_params.get('academic_year')

        data = FacultyAnalyticsService.get_faculty_analytics(
            college=college, user=user, department_id=dept_id, academic_year_id=ay_id
        )
        return Response(data)


class EvidenceHealthView(APIView):
    """
    Evidence Repository Health & Integrity Analytics (Section 8).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college
        ay_id = request.query_params.get('academic_year')

        data = EvidenceAnalyticsService.get_evidence_health(college, ay_id)
        return Response(data)


class VerificationPipelineView(APIView):
    """
    Verification Pipeline & Bottleneck Identification (Sections 9 & 10).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college
        dept_id = request.query_params.get('department')

        if user.role in ['HOD', 'DEPARTMENT_INCHARGE'] and user.department:
            dept_id = str(user.department.id)

        data = VerificationPipelineAnalyticsService.get_pipeline_analytics(college, dept_id)
        return Response(data)


class EvidenceGapMatrixView(APIView):
    """
    Evidence Gap Cross-Tabulation Matrix (Section 11).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college
        fw_id = request.query_params.get('framework')
        ay_id = request.query_params.get('academic_year')

        data = EvidenceGapMatrixService.get_gap_matrix(college, fw_id, ay_id)
        return Response(data)


class DataQualityView(APIView):
    """
    Institutional Data Hygiene Scanner (Section 13).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college
        data = DataQualityService.scan_data_quality(college)
        return Response(data)


class AIInsightsView(APIView):
    """
    AI Executive Insights Endpoint (Sections 14 & 15).
    GET: Retrieve active insights with source grounding.
    POST: Generate refreshed advisory insights (IQAC & Super Admin only).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college
        insights = AIExecutiveInsight.objects.filter(college=college, is_active=True)
        return Response(AIExecutiveInsightSerializer(insights, many=True).data)

    def post(self, request):
        user = request.user
        college = user.college
        if user.role not in ['SUPER_ADMIN', 'IQAC']:
            raise PermissionDenied("Only IQAC Coordinators can trigger AI Executive Insight generation.")

        ay_id = request.data.get('academic_year')
        # Soft-deactivate previous insights
        AIExecutiveInsight.objects.filter(college=college).update(is_active=False)

        # Generate new grounded insights
        new_insights = AIInsightEngine.generate_executive_insights(college, user, ay_id)

        log_action(
            actor=user,
            action="GENERATE_AI_EXECUTIVE_INSIGHTS",
            comment=f"Generated {len(new_insights)} AI Executive Insights for {college.code}"
        )

        return Response(
            AIExecutiveInsightSerializer(new_insights, many=True).data,
            status=status.HTTP_201_CREATED
        )


class ForecastView(APIView):
    """
    Forecasting & Projection Endpoint (Section 17).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        college = user.college
        ay_id = request.query_params.get('academic_year')
        data = ForecastingService.forecast_preparation(college, ay_id)
        return Response(data)

