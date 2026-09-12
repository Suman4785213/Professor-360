"""
Criteria app serializers — Phase 5: IQAC Criteria, Metrics & Evidence Mapping
"""
from rest_framework import serializers
from apps.evidence.serializers import EvidenceListSerializer
from .models import Framework, Criterion, Metric, EvidenceRequirement, EvidenceMapping


class FrameworkSerializer(serializers.ModelSerializer):
    criteria_count = serializers.SerializerMethodField()

    class Meta:
        model = Framework
        fields = [
            'id', 'name', 'code', 'version', 'description',
            'is_active', 'college', 'criteria_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_criteria_count(self, obj):
        return obj.criteria.filter(is_active=True).count()


class EvidenceRequirementSerializer(serializers.ModelSerializer):
    document_category_name = serializers.CharField(source='document_category.name', read_only=True)
    document_category_code = serializers.CharField(source='document_category.code', read_only=True)

    class Meta:
        model = EvidenceRequirement
        fields = [
            'id', 'metric', 'name', 'document_category',
            'document_category_name', 'document_category_code',
            'description', 'required_count', 'is_mandatory',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MetricListSerializer(serializers.ModelSerializer):
    evidence_count = serializers.SerializerMethodField()
    criterion_number = serializers.CharField(source='criterion.number', read_only=True)

    class Meta:
        model = Metric
        fields = [
            'id', 'criterion', 'criterion_number', 'number', 'title',
            'description', 'weightage', 'benchmark_count', 'display_order',
            'is_required', 'is_active', 'evidence_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_evidence_count(self, obj):
        return obj.evidence_mappings.filter(status='ACTIVE').count()


class MetricDetailSerializer(serializers.ModelSerializer):
    requirements = EvidenceRequirementSerializer(many=True, read_only=True)
    evidence_count = serializers.SerializerMethodField()
    criterion_number = serializers.CharField(source='criterion.number', read_only=True)
    criterion_title = serializers.CharField(source='criterion.title', read_only=True)

    class Meta:
        model = Metric
        fields = [
            'id', 'criterion', 'criterion_number', 'criterion_title',
            'number', 'title', 'description', 'weightage',
            'benchmark_count', 'display_order', 'is_required',
            'is_active', 'evidence_count', 'requirements',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_evidence_count(self, obj):
        return obj.evidence_mappings.filter(status='ACTIVE').count()


class CriterionListSerializer(serializers.ModelSerializer):
    metrics_count = serializers.SerializerMethodField()
    evidence_count = serializers.SerializerMethodField()
    framework_name = serializers.CharField(source='framework_ref.name', read_only=True)

    class Meta:
        model = Criterion
        fields = [
            'id', 'framework', 'framework_ref', 'framework_name',
            'number', 'title', 'description', 'weightage',
            'display_order', 'is_active', 'metrics_count',
            'evidence_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_metrics_count(self, obj):
        return obj.metrics.filter(is_active=True).count()

    def get_evidence_count(self, obj):
        return EvidenceMapping.objects.filter(criterion=obj, status='ACTIVE').count()


class CriterionDetailSerializer(serializers.ModelSerializer):
    metrics = MetricListSerializer(many=True, read_only=True)
    framework_name = serializers.CharField(source='framework_ref.name', read_only=True)

    class Meta:
        model = Criterion
        fields = [
            'id', 'framework', 'framework_ref', 'framework_name',
            'number', 'title', 'description', 'weightage',
            'display_order', 'is_active', 'metrics',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EvidenceMappingListSerializer(serializers.ModelSerializer):
    metric_number = serializers.CharField(source='metric.number', read_only=True)
    metric_title = serializers.CharField(source='metric.title', read_only=True)
    criterion_number = serializers.CharField(source='criterion.number', read_only=True)
    criterion_title = serializers.CharField(source='criterion.title', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    mapped_by_name = serializers.CharField(source='mapped_by.get_full_name', read_only=True)

    # Evidence details
    evidence_title = serializers.CharField(source='evidence.title', read_only=True)
    evidence_category = serializers.CharField(source='evidence.category', read_only=True)
    faculty_name = serializers.CharField(source='evidence.faculty.get_full_name', read_only=True)
    faculty_employee_id = serializers.CharField(source='evidence.faculty.employee_id', read_only=True)
    department_name = serializers.CharField(source='evidence.department.name', read_only=True)
    department_code = serializers.CharField(source='evidence.department.code', read_only=True)
    document_name = serializers.CharField(source='evidence.document.file_name', read_only=True)
    document_hash = serializers.CharField(source='evidence.document.file_hash', read_only=True)
    preview_url = serializers.CharField(source='evidence.document.preview_url', read_only=True)
    download_url = serializers.CharField(source='evidence.document.download_url', read_only=True)

    class Meta:
        model = EvidenceMapping
        fields = [
            'id', 'college', 'criterion', 'criterion_number', 'criterion_title',
            'metric', 'metric_number', 'metric_title',
            'evidence', 'evidence_title', 'evidence_category',
            'faculty_name', 'faculty_employee_id',
            'department_name', 'department_code',
            'document_name', 'document_hash', 'preview_url', 'download_url',
            'academic_year', 'academic_year_name',
            'mapped_by', 'mapped_by_name',
            'notes', 'status', 'archived_at', 'archive_reason',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'archived_at', 'archived_by', 'archive_reason', 'created_at', 'updated_at']


class EvidenceMappingCreateSerializer(serializers.Serializer):
    metric = serializers.UUIDField()
    evidence = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class BulkEvidenceMappingSerializer(serializers.Serializer):
    metric = serializers.UUIDField()
    evidence_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')
