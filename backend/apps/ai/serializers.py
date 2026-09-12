"""
AI Certificate Intelligence — Serializers
"""
from rest_framework import serializers
from apps.ai.models import (
    AIProcessingJob,
    AIExtractionResult,
    AIFieldConfidence,
    AIClassificationResult,
    AICorrectionLog,
)


class AIFieldConfidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIFieldConfidence
        fields = ['field_name', 'value', 'confidence', 'is_detected']


class AIClassificationResultSerializer(serializers.ModelSerializer):
    suggested_name = serializers.CharField(source='suggested_category.name', read_only=True)

    class Meta:
        model = AIClassificationResult
        fields = [
            'suggested_category',
            'suggested_code',
            'suggested_name',
            'confidence',
            'alternative_categories',
            'explanation',
        ]


class AIExtractionResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIExtractionResult
        fields = [
            'ai_document_type',
            'raw_text',
            'extracted_data',
            'overall_confidence',
        ]


class AIProcessingJobSerializer(serializers.ModelSerializer):
    extraction_result = AIExtractionResultSerializer(read_only=True)
    classification_result = AIClassificationResultSerializer(read_only=True)
    field_confidences = AIFieldConfidenceSerializer(many=True, read_only=True)

    class Meta:
        model = AIProcessingJob
        fields = [
            'id',
            'file_name',
            'file_size',
            'mime_type',
            'file_hash',
            'status',
            'provider',
            'model_name',
            'execution_time_ms',
            'error_message',
            'extraction_result',
            'classification_result',
            'field_confidences',
            'activity',
            'document',
            'created_at',
            'updated_at',
        ]


class AIUploadRequestSerializer(serializers.Serializer):
    file = serializers.FileField(required=True)
    provider_override = serializers.CharField(required=False, allow_blank=True)


class FieldCorrectionItemSerializer(serializers.Serializer):
    field_name = serializers.CharField(max_length=100)
    original_value = serializers.CharField(allow_blank=True, required=False)
    corrected_value = serializers.CharField(allow_blank=True, required=False)


class AIConfirmRequestSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=300, required=True)
    category = serializers.UUIDField(required=True)
    academic_year = serializers.UUIDField(required=False, allow_null=True)
    organizer = serializers.CharField(max_length=200, required=False, allow_blank=True)
    location = serializers.CharField(max_length=200, required=False, allow_blank=True)
    venue = serializers.CharField(max_length=200, required=False, allow_blank=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    duration = serializers.CharField(max_length=100, required=False, allow_blank=True)
    certificate_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    additional_remarks = serializers.CharField(required=False, allow_blank=True)
    submit_for_verification = serializers.BooleanField(default=False)
    corrections = FieldCorrectionItemSerializer(many=True, required=False, default=list)


class AISearchRequestSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=500, required=True)
    provider_override = serializers.CharField(required=False, allow_blank=True)


class AICopilotMessageSerializer(serializers.ModelSerializer):
    class Meta:
        from apps.ai.models import AICopilotMessage
        model = AICopilotMessage
        fields = [
            'id',
            'conversation_id',
            'role',
            'content',
            'intent',
            'confidence_level',
            'sources',
            'suggested_actions',
            'pending_action',
            'action_confirmed',
            'model_used',
            'execution_time_ms',
            'created_at',
        ]


class AICopilotConversationSerializer(serializers.ModelSerializer):
    messages_count = serializers.IntegerField(source='messages.count', read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        from apps.ai.models import AICopilotConversation
        model = AICopilotConversation
        fields = [
            'id',
            'title',
            'is_pinned',
            'messages_count',
            'last_message',
            'created_at',
            'updated_at',
        ]

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if last:
            return {
                'role': last.role,
                'content': last.content[:100],
                'created_at': last.created_at.isoformat(),
            }
        return None


class AICopilotChatRequestSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    content = serializers.CharField(required=True, allow_blank=False)


class AICopilotActionConfirmSerializer(serializers.Serializer):
    message_id = serializers.UUIDField(required=True)
    confirm = serializers.BooleanField(required=True)


class AICopilotFeedbackSerializer(serializers.Serializer):
    message_id = serializers.UUIDField(required=True)
    is_helpful = serializers.BooleanField(required=True)
    reason = serializers.CharField(required=False, allow_blank=True)
    comment = serializers.CharField(required=False, allow_blank=True)

