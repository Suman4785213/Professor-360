"""
Criteria app views — Phase 5: IQAC Criteria, Metrics & Evidence Mapping APIs
"""
from django.db import models
from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from core.mixins import TenantMixin
from core.permissions import IsSuperAdminOrIQAC
from apps.audit.utils import log_action
from .models import Framework, Criterion, Metric, EvidenceRequirement, EvidenceMapping
from .serializers import (
    FrameworkSerializer,
    CriterionListSerializer,
    CriterionDetailSerializer,
    MetricListSerializer,
    MetricDetailSerializer,
    EvidenceRequirementSerializer,
    EvidenceMappingListSerializer,
    EvidenceMappingCreateSerializer,
    BulkEvidenceMappingSerializer,
)
from .services import CriteriaProgressService, EvidenceDiscoveryService, EvidenceMappingService


class FrameworkViewSet(TenantMixin, viewsets.ModelViewSet):
    """
    Accreditation frameworks (NAAC, NIRF, Demo Framework 2026).
    Enables multi-framework evaluation cycles without code changes.
    """
    queryset = Framework.objects.filter(is_active=True).order_by('name')
    serializer_class = FrameworkSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSuperAdminOrIQAC()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Framework.objects.none()
        if user.role == 'SUPER_ADMIN':
            return Framework.objects.filter(is_active=True)
        # Institutional user sees global frameworks (college=None) and own college frameworks
        return Framework.objects.filter(
            models.Q(college__isnull=True) | models.Q(college=user.college),
            is_active=True
        )


class CriterionViewSet(TenantMixin, viewsets.ModelViewSet):
    """
    Accreditation Criteria management and real-time progress calculations.
    """
    queryset = Criterion.objects.filter(is_active=True).order_by('display_order', 'number')
    filterset_fields = ['framework', 'framework_ref', 'is_active']
    search_fields = ['title', 'number', 'description']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CriterionDetailSerializer
        return CriterionListSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'dashboard', 'progress']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSuperAdminOrIQAC()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Criterion.objects.none()
        qs = Criterion.objects.filter(is_active=True)
        if user.role != 'SUPER_ADMIN' and user.college:
            qs = qs.filter(college=user.college)
        return qs.order_by('display_order', 'number')

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Global Criteria Progress & Evidence Availability Dashboard (Section 5, 20).
        Calculates real-time metrics, completion rates, and availability badges across criteria.
        """
        user = request.user
        college = user.college if user.role != 'SUPER_ADMIN' else None
        framework_id = request.query_params.get('framework')
        academic_year_id = request.query_params.get('academic_year')

        progress_data = CriteriaProgressService.get_framework_progress(
            college=college,
            framework_id=framework_id,
            academic_year_id=academic_year_id
        )
        return Response(progress_data)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """
        Detailed breakdown for a specific Criterion (Section 6).
        Lists each metric with target benchmark, mapped evidence count, and availability status.
        """
        criterion = self.get_object()
        academic_year_id = request.query_params.get('academic_year')
        progress_data = CriteriaProgressService.get_criterion_detail_progress(
            criterion=criterion,
            academic_year_id=academic_year_id
        )
        return Response(progress_data)


class MetricViewSet(TenantMixin, viewsets.ModelViewSet):
    """
    Measurable Quality Indicators & Metrics.
    """
    queryset = Metric.objects.filter(is_active=True).order_by('display_order', 'number')
    filterset_fields = ['criterion', 'is_active']
    search_fields = ['title', 'number', 'description']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MetricDetailSerializer
        return MetricListSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'evidence', 'suggestions', 'contributions']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSuperAdminOrIQAC()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Metric.objects.none()
        qs = Metric.objects.filter(is_active=True)
        if user.role != 'SUPER_ADMIN' and user.college:
            qs = qs.filter(college=user.college)
        return qs.order_by('display_order', 'number')

    @action(detail=True, methods=['get'])
    def evidence(self, request, pk=None):
        """
        Lists all mapped verified institutional evidence for this metric (Section 12, 13).
        Supports filtering by academic_year, department, faculty, and search.
        """
        metric = self.get_object()
        user = request.user

        mappings = EvidenceMapping.objects.filter(metric=metric)

        # Archive filter (Default active)
        status_param = request.query_params.get('status', 'ACTIVE')
        if status_param != 'ALL':
            mappings = mappings.filter(status=status_param)

        # Scoping per user role
        if user.role == 'FACULTY':
            mappings = mappings.filter(evidence__faculty=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE'] and user.department:
            mappings = mappings.filter(evidence__department=user.department)

        # Query filters
        ay_id = request.query_params.get('academic_year')
        if ay_id:
            mappings = mappings.filter(academic_year_id=ay_id)

        dept_id = request.query_params.get('department')
        if dept_id:
            mappings = mappings.filter(evidence__department_id=dept_id)

        search = request.query_params.get('search')
        if search:
            mappings = mappings.filter(
                models.Q(evidence__title__icontains=search) |
                models.Q(evidence__faculty__first_name__icontains=search) |
                models.Q(evidence__faculty__last_name__icontains=search) |
                models.Q(evidence__faculty__employee_id__icontains=search) |
                models.Q(evidence__department__name__icontains=search)
            )

        mappings = mappings.select_related(
            'evidence', 'evidence__faculty', 'evidence__department',
            'evidence__document', 'academic_year', 'mapped_by', 'metric', 'criterion'
        ).order_by('-created_at')

        serializer = EvidenceMappingListSerializer(mappings, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def suggestions(self, request, pk=None):
        """
        Automatic candidate evidence discovery for this metric (Section 16).
        """
        metric = self.get_object()
        user = request.user
        college = user.college if user.role != 'SUPER_ADMIN' else metric.college
        suggestions = EvidenceDiscoveryService.suggest_evidence_for_metric(
            metric=metric,
            college=college,
            limit=15
        )
        return Response(suggestions)

    @action(detail=True, methods=['get'])
    def contributions(self, request, pk=None):
        """
        Department and faculty breakdown for this metric (Section 18, 19).
        """
        metric = self.get_object()
        academic_year_id = request.query_params.get('academic_year')
        contributions_data = CriteriaProgressService.get_metric_contributions(
            metric=metric,
            academic_year_id=academic_year_id
        )
        return Response(contributions_data)


class EvidenceRequirementViewSet(TenantMixin, viewsets.ModelViewSet):
    """
    Evidence documentation benchmarks for Metrics (Section 15).
    """
    queryset = EvidenceRequirement.objects.all().select_related('metric', 'document_category')
    serializer_class = EvidenceRequirementSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdminOrIQAC]


class EvidenceMappingViewSet(TenantMixin, viewsets.ModelViewSet):
    """
    Central Evidence Mapping API.
    Connects verified evidence to criteria/metrics.
    """
    queryset = EvidenceMapping.objects.all().select_related(
        'metric', 'criterion', 'evidence', 'academic_year', 'mapped_by'
    )
    serializer_class = EvidenceMappingListSerializer
    filterset_fields = ['metric', 'criterion', 'academic_year', 'status']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSuperAdminOrIQAC()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return EvidenceMapping.objects.none()

        qs = EvidenceMapping.objects.all().select_related(
            'metric', 'criterion', 'evidence', 'evidence__faculty',
            'evidence__department', 'evidence__document', 'academic_year', 'mapped_by'
        )

        # Tenant boundary
        if user.role != 'SUPER_ADMIN' and user.college:
            qs = qs.filter(college=user.college)

        # Role scoping
        if user.role == 'FACULTY':
            qs = qs.filter(evidence__faculty=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE'] and user.department:
            qs = qs.filter(evidence__department=user.department)

        status_param = self.request.query_params.get('status', 'ACTIVE')
        if status_param != 'ALL':
            qs = qs.filter(status=status_param)

        evidence_id = self.request.query_params.get('evidence')
        if evidence_id:
            qs = qs.filter(evidence_id=evidence_id)

        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """Maps a verified evidence record to a metric (Section 8, 31)."""
        serializer = EvidenceMappingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mapping = EvidenceMappingService.map_evidence(
            user=request.user,
            metric_id=serializer.validated_data['metric'],
            evidence_id=serializer.validated_data['evidence'],
            notes=serializer.validated_data.get('notes', '')
        )

        out_serializer = EvidenceMappingListSerializer(mapping)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsSuperAdminOrIQAC])
    def bulk(self, request):
        """Safe bulk mapping of verified evidence records (Section 27)."""
        serializer = BulkEvidenceMappingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = EvidenceMappingService.bulk_map_evidence(
            user=request.user,
            metric_id=serializer.validated_data['metric'],
            evidence_ids=serializer.validated_data['evidence_ids'],
            notes=serializer.validated_data.get('notes', '')
        )

        return Response({
            'message': f"Successfully mapped {result['mapped_count']} evidence records to Metric {result['metric_number']}.",
            'mapped_count': result['mapped_count'],
            'skipped_duplicates': result['skipped_duplicates'],
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsSuperAdminOrIQAC])
    def archive(self, request, pk=None):
        """Archives an evidence mapping while preserving historical audit log (Section 26)."""
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'detail': 'An archive reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        mapping = EvidenceMappingService.archive_mapping(
            user=request.user,
            mapping_id=pk,
            reason=reason
        )
        return Response({
            'status': 'ARCHIVED',
            'message': f"Evidence mapping archived successfully. Rationale: {reason}"
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsSuperAdminOrIQAC])
    def restore(self, request, pk=None):
        """Restores an archived mapping back to active repository."""
        mapping = EvidenceMappingService.restore_mapping(
            user=request.user,
            mapping_id=pk
        )
        return Response({
            'status': 'ACTIVE',
            'message': "Evidence mapping restored successfully."
        })
