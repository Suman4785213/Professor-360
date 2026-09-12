"""
Serializers for Integrations & Communication — Phase 16
"""
from rest_framework import serializers
from apps.integrations.models import (
    EmailTemplate,
    EmailDeliveryLog,
    Announcement,
    SSOConfiguration,
    CalendarSyncRecord,
    IncomingWebhookLog,
    StorageMigrationJob,
)


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'college', 'name', 'event', 'subject',
            'body', 'variables', 'version', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EmailDeliveryLogSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)

    class Meta:
        model = EmailDeliveryLog
        fields = [
            'id', 'college', 'recipient', 'event', 'template',
            'template_name', 'subject', 'status', 'attempt_count',
            'max_attempts', 'next_retry_at', 'provider',
            'provider_response', 'error_code', 'deduplication_key',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    department_name = serializers.CharField(source='target_department.name', read_only=True)
    academic_year_name = serializers.CharField(source='target_academic_year.name', read_only=True)
    is_current = serializers.BooleanField(read_only=True)
    content = serializers.CharField(source='message', required=False)
    audience = serializers.CharField(source='audience_type', required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)

    class Meta:
        model = Announcement
        fields = [
            'id', 'college', 'title', 'message', 'content', 'priority',
            'audience_type', 'audience', 'target_department', 'department_name',
            'target_role', 'target_academic_year', 'academic_year_name',
            'start_date', 'end_date', 'is_active', 'is_current',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'college', 'created_by', 'created_at', 'updated_at', 'is_current']

    def validate(self, attrs):
        from django.utils import timezone
        from datetime import timedelta
        if not attrs.get('start_date'):
            attrs['start_date'] = timezone.now().date()
        if not attrs.get('end_date'):
            attrs['end_date'] = attrs['start_date'] + timedelta(days=30)
        return attrs


class SSOConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SSOConfiguration
        fields = [
            'id', 'college', 'sso_enabled', 'provider_type',
            'client_id', 'issuer_url', 'allowed_domains',
            'status', 'last_verified_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CalendarSyncRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarSyncRecord
        fields = [
            'id', 'college', 'user', 'event_type', 'entity_id',
            'summary', 'description', 'start_time', 'end_time',
            'uid', 'sync_status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class IncomingWebhookLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncomingWebhookLog
        fields = [
            'id', 'college', 'source', 'event', 'payload',
            'signature', 'is_valid', 'status', 'error_message',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class StorageMigrationJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorageMigrationJob
        fields = [
            'id', 'college', 'source_storage', 'destination_storage',
            'status', 'total_files', 'migrated_files', 'failed_files',
            'log', 'created_at', 'completed_at'
        ]
        read_only_fields = ['id', 'created_at', 'completed_at']
