"""
Serializers for Support & Operations — Phase 18
"""
from rest_framework import serializers
from apps.accounts.models import User, RoleChoices
from .models import (
    SupportTicket,
    TicketComment,
    TicketAttachment,
    Incident,
    KnowledgeBaseCategory,
    KnowledgeBaseArticle,
    SecurityEvent,
    SystemMaintenanceSetting,
)


class TicketAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = TicketAttachment
        fields = [
            'id', 'ticket', 'uploaded_by', 'uploaded_by_name',
            'file', 'file_url', 'file_name', 'file_size', 'mime_type', 'created_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'file_name', 'file_size', 'mime_type', 'created_at']

    def get_uploaded_by_name(self, obj):
        return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip() or obj.uploaded_by.email

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class TicketCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_role = serializers.CharField(source='author.role', read_only=True)
    author_email = serializers.CharField(source='author.email', read_only=True)

    class Meta:
        model = TicketComment
        fields = [
            'id', 'ticket', 'author', 'author_name', 'author_role', 'author_email',
            'is_internal', 'message', 'created_at'
        ]
        read_only_fields = ['id', 'ticket', 'author', 'created_at']

    def get_author_name(self, obj):
        return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.email


class SupportTicketSerializer(serializers.ModelSerializer):
    college_name = serializers.CharField(source='college.name', read_only=True)
    college_code = serializers.CharField(source='college.code', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    attachments_count = serializers.IntegerField(source='attachments.count', read_only=True)
    comments = serializers.SerializerMethodField()
    attachments = TicketAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'ticket_number', 'college', 'college_name', 'college_code',
            'created_by', 'created_by_name', 'created_by_email',
            'category', 'priority', 'status', 'sla_status',
            'subject', 'description',
            'assigned_to', 'assigned_to_name',
            'first_responded_at', 'resolved_at', 'resolution_notes',
            'first_response_due_at', 'resolution_due_at',
            'comments_count', 'attachments_count',
            'comments', 'attachments',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'ticket_number', 'college', 'created_by',
            'sla_status', 'first_responded_at', 'resolved_at',
            'first_response_due_at', 'resolution_due_at',
            'created_at', 'updated_at'
        ]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip() or obj.assigned_to.email
        return None

    def get_comments(self, obj):
        request = self.context.get('request')
        qs = obj.comments.all()
        # Non-superadmins CANNOT see internal comments
        if not request or getattr(request.user, 'role', '') != RoleChoices.SUPER_ADMIN:
            qs = qs.filter(is_internal=False)
        return TicketCommentSerializer(qs, many=True, context=self.context).data


class SupportTicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ['category', 'priority', 'subject', 'description']

    def validate_subject(self, value):
        if not value or len(value.strip()) < 5:
            raise serializers.ValidationError("Subject must be at least 5 characters long.")
        return value.strip()

    def validate_description(self, value):
        if not value or len(value.strip()) < 10:
            raise serializers.ValidationError("Description must be at least 10 characters long.")
        return value.strip()


class IncidentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    affected_tenants_names = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            'id', 'title', 'severity', 'status', 'description',
            'affects_all_tenants', 'affected_tenants', 'affected_tenants_names',
            'started_at', 'mitigated_at', 'resolved_at', 'resolution',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return 'System'

    def get_affected_tenants_names(self, obj):
        if obj.affects_all_tenants:
            return ['All Institutions']
        return list(obj.affected_tenants.values_list('name', flat=True))


class KnowledgeBaseArticleSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeBaseArticle
        fields = [
            'id', 'category', 'category_name', 'title', 'slug', 'content',
            'status', 'view_count', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'view_count', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return 'Staff'


class KnowledgeBaseCategorySerializer(serializers.ModelSerializer):
    articles = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeBaseCategory
        fields = ['id', 'name', 'slug', 'order', 'articles']

    def get_articles(self, obj):
        # Only published articles for non-superadmin
        request = self.context.get('request')
        qs = obj.articles.all()
        if not request or getattr(request.user, 'role', '') != RoleChoices.SUPER_ADMIN:
            qs = qs.filter(status='PUBLISHED')
        return KnowledgeBaseArticleSerializer(qs, many=True, context=self.context).data


class SecurityEventSerializer(serializers.ModelSerializer):
    college_name = serializers.CharField(source='college.name', read_only=True)

    class Meta:
        model = SecurityEvent
        fields = [
            'id', 'event_type', 'severity', 'college', 'college_name',
            'user', 'user_email', 'ip_address', 'path', 'details',
            'resolved', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SystemMaintenanceSerializer(serializers.ModelSerializer):
    updated_by_email = serializers.CharField(source='updated_by.email', read_only=True)

    class Meta:
        model = SystemMaintenanceSetting
        fields = [
            'is_enabled', 'reason', 'estimated_duration_minutes',
            'updated_at', 'updated_by_email'
        ]
