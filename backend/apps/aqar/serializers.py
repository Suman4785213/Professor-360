"""
AQAR and SSR Compliance Serializers — Phase 8
"""
from rest_framework import serializers
from apps.criteria.models import Section, Metric, MetricDataRequirement, MetricDataValue
from apps.evidence.models import Evidence
from .models import (
    ComplianceNarrative, ComplianceNarrativeVersion,
    DataRequest, PreparationChecklistItem
)


class SectionSerializer(serializers.ModelSerializer):
    criteria_count = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = [
            'id', 'name', 'code', 'description', 'display_order',
            'is_active', 'criteria_count', 'created_at'
        ]

    def get_criteria_count(self, obj):
        return obj.criteria.filter(is_active=True).count()


class ComplianceNarrativeVersionSerializer(serializers.ModelSerializer):
    edited_by_name = serializers.ReadOnlyField(source='edited_by.get_full_name')

    class Meta:
        model = ComplianceNarrativeVersion
        fields = [
            'id', 'version_number', 'narrative_text', 'status',
            'edited_by', 'edited_by_name', 'change_reason', 'created_at'
        ]


class ComplianceNarrativeSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField(source='author.get_full_name')
    approved_by_name = serializers.ReadOnlyField(source='approved_by.get_full_name')
    metric_number = serializers.ReadOnlyField(source='metric.number')
    metric_title = serializers.ReadOnlyField(source='metric.title')
    versions = ComplianceNarrativeVersionSerializer(many=True, read_only=True)
    source_evidence_count = serializers.SerializerMethodField()

    class Meta:
        model = ComplianceNarrative
        fields = [
            'id', 'workspace_type', 'college', 'academic_year', 'metric',
            'metric_number', 'metric_title', 'narrative_text', 'status',
            'author', 'author_name', 'approved_by', 'approved_by_name', 'approved_at',
            'is_ai_drafted', 'ai_model', 'version', 'source_evidence',
            'source_evidence_count', 'review_comments', 'versions',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'version', 'approved_by', 'approved_at', 'created_at', 'updated_at']

    def get_source_evidence_count(self, obj):
        return obj.source_evidence.count()


class DataRequestSerializer(serializers.ModelSerializer):
    metric_number = serializers.ReadOnlyField(source='metric.number')
    metric_title = serializers.ReadOnlyField(source='metric.title')
    department_name = serializers.ReadOnlyField(source='department.name')
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.get_full_name')
    requested_by_name = serializers.ReadOnlyField(source='requested_by.get_full_name')
    response_evidence_title = serializers.ReadOnlyField(source='response_evidence.title')

    class Meta:
        model = DataRequest
        fields = [
            'id', 'college', 'workspace_type', 'metric', 'metric_number', 'metric_title',
            'academic_year', 'department', 'department_name', 'assigned_to', 'assigned_to_name',
            'requested_by', 'requested_by_name', 'title', 'description', 'required_evidence_type',
            'due_date', 'priority', 'status', 'response_evidence', 'response_evidence_title',
            'submission_notes', 'rejection_reason', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'requested_by', 'created_at', 'updated_at']


class PreparationChecklistItemSerializer(serializers.ModelSerializer):
    owner_name = serializers.ReadOnlyField(source='owner.get_full_name')
    department_name = serializers.ReadOnlyField(source='department.name')
    metric_number = serializers.ReadOnlyField(source='metric.number')
    completed_by_name = serializers.ReadOnlyField(source='completed_by.get_full_name')

    class Meta:
        model = PreparationChecklistItem
        fields = [
            'id', 'college', 'workspace_type', 'academic_year', 'title', 'description',
            'owner', 'owner_name', 'department', 'department_name', 'metric', 'metric_number',
            'due_date', 'priority', 'status', 'is_system_item', 'display_order',
            'completed_at', 'completed_by', 'completed_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'completed_at', 'completed_by', 'created_at', 'updated_at']


class MetricDataRequirementSerializer(serializers.ModelSerializer):
    metric_number = serializers.ReadOnlyField(source='metric.number')

    class Meta:
        model = MetricDataRequirement
        fields = [
            'id', 'metric', 'metric_number', 'field_name', 'data_type',
            'calculation_source', 'activity_category_code', 'benchmark_value',
            'description', 'is_mandatory', 'created_at', 'updated_at'
        ]


class MetricDataValueSerializer(serializers.ModelSerializer):
    field_name = serializers.ReadOnlyField(source='requirement.field_name')
    data_type = serializers.ReadOnlyField(source='requirement.data_type')
    effective_value = serializers.SerializerMethodField()

    class Meta:
        model = MetricDataValue
        fields = [
            'id', 'requirement', 'field_name', 'data_type', 'college', 'academic_year',
            'calculated_value', 'manual_override_value', 'is_overridden',
            'override_reason', 'effective_value', 'updated_by', 'updated_at'
        ]

    def get_effective_value(self, obj):
        return obj.get_effective_value()
