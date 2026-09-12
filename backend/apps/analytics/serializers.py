"""
Analytics Serializers — Phase 9: Advanced Analytics & Executive Intelligence
"""
from rest_framework import serializers
from .models import ExecutiveSnapshot, AIExecutiveInsight, ScheduledAnalyticsConfig


class ExecutiveSnapshotSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.ReadOnlyField(source='academic_year.name')

    class Meta:
        model = ExecutiveSnapshot
        fields = [
            'id', 'college', 'academic_year', 'academic_year_name', 'snapshot_date',
            'total_faculty', 'total_activities', 'verified_evidence_count',
            'pending_verification_count', 'aqar_completeness_pct', 'ssr_completeness_pct',
            'data_quality_score', 'bottleneck_count', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AIExecutiveInsightSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.ReadOnlyField(source='academic_year.name')
    affected_department_names = serializers.SerializerMethodField()

    class Meta:
        model = AIExecutiveInsight
        fields = [
            'id', 'college', 'academic_year', 'academic_year_name', 'category',
            'title', 'narrative', 'severity', 'source_metrics', 'affected_departments',
            'affected_department_names', 'time_period', 'recommended_action',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_affected_department_names(self, obj):
        return [d.name for d in obj.affected_departments.all()]


class ScheduledAnalyticsConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduledAnalyticsConfig
        fields = [
            'id', 'college', 'report_title', 'frequency', 'recipient_role',
            'target_email', 'is_active', 'last_run_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
