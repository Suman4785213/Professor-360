from core.serializers import TenantRelationsMixin
from rest_framework import serializers
from apps.notifications.models import (
    Notification,
    NotificationPreference,
    NotificationTemplate,
    IQACTask,
    TaskActivity,
    TaskComment,
    AutomationRule,
)
from apps.accounts.models import User
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.criteria.models import Metric
from apps.evidence.models import Evidence


class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'college',
            'recipient',
            'recipient_name',
            'sender',
            'sender_name',
            'category',
            'notification_type',
            'title',
            'body',
            'priority',
            'action_url',
            'action_label',
            'related_model',
            'related_id',
            'is_read',
            'read_at',
            'deduplication_key',
            'metadata',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'college',
            'sender',
            'created_at',
            'read_at',
            'deduplication_key',
        ]

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() if obj.sender else 'System'

    def get_recipient_name(self, obj):
        return obj.recipient.get_full_name() if obj.recipient else ''


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    channel_in_app = serializers.BooleanField(source='in_app_enabled', required=False)
    channel_email = serializers.BooleanField(source='email_enabled', required=False)
    channel_sms = serializers.BooleanField(source='sms_enabled', required=False)
    channel_whatsapp = serializers.BooleanField(source='whatsapp_enabled', required=False)
    channel_push = serializers.BooleanField(source='push_enabled', required=False)

    class Meta:
        model = NotificationPreference
        fields = [
            'id',
            'user',
            'in_app_enabled',
            'email_enabled',
            'sms_enabled',
            'whatsapp_enabled',
            'push_enabled',
            'channel_in_app',
            'channel_email',
            'channel_sms',
            'channel_whatsapp',
            'channel_push',
            'category_verification',
            'category_tasks',
            'category_deadlines',
            'category_aqar_ssr',
            'category_reports',
            'category_system',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'updated_at']


class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = [
            'id',
            'college',
            'code',
            'title_template',
            'body_template',
            'action_url_template',
            'action_label',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaskActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_email = serializers.SerializerMethodField()

    class Meta:
        model = TaskActivity
        fields = [
            'id',
            'task',
            'actor',
            'actor_name',
            'actor_email',
            'action',
            'details',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_actor_name(self, obj):
        return obj.actor.get_full_name() if obj.actor else 'System'

    def get_actor_email(self, obj):
        return obj.actor.email if obj.actor else ''


class TaskCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_email = serializers.SerializerMethodField()

    class Meta:
        model = TaskComment
        fields = [
            'id',
            'task',
            'author',
            'author_name',
            'author_email',
            'comment',
            'created_at',
        ]
        read_only_fields = ['id', 'author', 'created_at']

    def get_author_name(self, obj):
        return obj.author.get_full_name() if obj.author else 'System'

    def get_author_email(self, obj):
        return obj.author.email if obj.author else ''


class IQACTaskSerializer(TenantRelationsMixin, serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()
    creator_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    academic_year_code = serializers.SerializerMethodField()
    metric_code = serializers.SerializerMethodField()
    metric_name = serializers.SerializerMethodField()
    evidence_title = serializers.SerializerMethodField()
    is_overdue = serializers.ReadOnlyField()
    activities_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = IQACTask
        fields = [
            'id',
            'college',
            'title',
            'description',
            'owner',
            'owner_name',
            'owner_email',
            'creator',
            'creator_name',
            'department',
            'department_name',
            'academic_year',
            'academic_year_code',
            'priority',
            'due_date',
            'status',
            'related_metric',
            'metric_code',
            'metric_name',
            'related_evidence',
            'evidence_title',
            'related_data_request',
            'deduplication_key',
            'is_automated',
            'completed_at',
            'completed_by',
            'is_overdue',
            'activities_count',
            'comments_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'college',
            'creator',
            'deduplication_key',
            'is_automated',
            'completed_at',
            'completed_by',
            'created_at',
            'updated_at',
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        user = self.context['request'].user
        owner = attrs.get('owner', getattr(self.instance, 'owner', None))
        department = attrs.get('department', getattr(self.instance, 'department', None))
        if not owner:
            raise serializers.ValidationError({'owner': 'An owner is required.'})
        if user.role == 'FACULTY' and owner != user:
            raise serializers.ValidationError({'owner': 'Faculty may assign tasks only to themselves.'})
        if user.role in ('HOD', 'DEPARTMENT_INCHARGE'):
            if not user.department_id or owner.department_id != user.department_id or (department and department.pk != user.department_id):
                raise serializers.ValidationError({'department': 'Tasks must remain in your assigned department.'})
        if 'status' in attrs and attrs['status'] != getattr(self.instance, 'status', 'TODO'):
            raise serializers.ValidationError({'status': 'Use a task status action.'})
        return attrs

    def get_owner_name(self, obj):
        return obj.owner.get_full_name() if obj.owner else ''

    def get_owner_email(self, obj):
        return obj.owner.email if obj.owner else ''

    def get_creator_name(self, obj):
        return obj.creator.get_full_name() if obj.creator else 'System'

    def get_department_name(self, obj):
        return obj.department.name if obj.department else ''

    def get_academic_year_code(self, obj):
        return obj.academic_year.name if obj.academic_year else ''

    def get_metric_code(self, obj):
        return obj.related_metric.number if obj.related_metric else ''

    def get_metric_name(self, obj):
        return obj.related_metric.title if obj.related_metric else ''

    def get_evidence_title(self, obj):
        return obj.related_evidence.title if obj.related_evidence else ''

    def get_activities_count(self, obj):
        return obj.activities.count()

    def get_comments_count(self, obj):
        return obj.comments.count()


class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRule
        fields = [
            'id',
            'college',
            'name',
            'description',
            'trigger',
            'condition',
            'action',
            'action_config',
            'is_active',
            'cooldown_hours',
            'last_triggered_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'college', 'last_triggered_at', 'created_at', 'updated_at']
