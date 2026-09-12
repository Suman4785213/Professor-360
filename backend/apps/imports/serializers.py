"""
Serializers for Imports and Integrations (Phase 14)
"""
from rest_framework import serializers
from apps.imports.models import ImportJob, ImportTemplate, APIKey, WebhookEndpoint, WebhookDeliveryLog


class ImportJobSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    college_name = serializers.CharField(source='college.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    data_type_display = serializers.CharField(source='get_data_type_display', read_only=True)

    class Meta:
        model = ImportJob
        fields = [
            'id',
            'college',
            'college_name',
            'user',
            'user_name',
            'data_type',
            'data_type_display',
            'file',
            'original_filename',
            'file_format',
            'status',
            'status_display',
            'mode',
            'column_mapping',
            'reference_mapping',
            'total_rows',
            'valid_rows',
            'warning_count',
            'error_count',
            'imported_count',
            'validation_results',
            'error_report_file',
            'created_at',
            'updated_at',
            'completed_at',
        ]
        read_only_fields = [
            'id',
            'college',
            'user',
            'total_rows',
            'valid_rows',
            'warning_count',
            'error_count',
            'imported_count',
            'validation_results',
            'created_at',
            'updated_at',
            'completed_at',
        ]


class ImportTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = ImportTemplate
        fields = [
            'id',
            'college',
            'name',
            'data_type',
            'column_mapping',
            'reference_mapping',
            'version',
            'is_active',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'college', 'created_by', 'created_at', 'updated_at']


class APIKeySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = APIKey
        fields = [
            'id',
            'college',
            'name',
            'key_prefix',
            'scopes',
            'is_active',
            'created_by',
            'created_by_name',
            'last_used_at',
            'expires_at',
            'created_at',
        ]
        read_only_fields = ['id', 'college', 'key_prefix', 'created_by', 'last_used_at', 'created_at']


class WebhookEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEndpoint
        fields = [
            'id',
            'college',
            'url',
            'secret',
            'events',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'college', 'created_at', 'updated_at']
        extra_kwargs = {
            'secret': {'write_only': False},  # displayed to admin upon setup
        }


class WebhookDeliveryLogSerializer(serializers.ModelSerializer):
    endpoint_url = serializers.CharField(source='endpoint.url', read_only=True)

    class Meta:
        model = WebhookDeliveryLog
        fields = [
            'id',
            'endpoint',
            'endpoint_url',
            'event',
            'payload',
            'response_status',
            'status',
            'attempt',
            'error_message',
            'created_at',
        ]
        read_only_fields = ['id', 'endpoint', 'endpoint_url', 'event', 'payload', 'response_status', 'status', 'attempt', 'error_message', 'created_at']
