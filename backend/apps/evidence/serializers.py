"""
Evidence app serializers — Phase 4
"""
from rest_framework import serializers
from .models import Evidence
from apps.activities.serializers import DocumentSerializer, ActivitySerializer


class EvidenceListSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.get_full_name', read_only=True)
    faculty_email = serializers.CharField(source='faculty.email', read_only=True)
    faculty_employee_id = serializers.CharField(source='faculty.employee_id', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_code = serializers.CharField(source='department.code', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    
    # Activity metadata
    activity_type = serializers.CharField(source='activity.activity_type', read_only=True)
    organizer = serializers.CharField(source='activity.organizer', read_only=True)
    location = serializers.CharField(source='activity.location', read_only=True)
    start_date = serializers.DateField(source='activity.start_date', read_only=True)
    end_date = serializers.DateField(source='activity.end_date', read_only=True)
    duration = serializers.CharField(source='activity.duration', read_only=True)
    certificate_number = serializers.CharField(source='activity.certificate_number', read_only=True)
    activity_status = serializers.CharField(source='activity.status', read_only=True)

    # Primary document metadata
    document_details = DocumentSerializer(source='document', read_only=True)
    documents_count = serializers.SerializerMethodField()
    archived_by_name = serializers.CharField(source='archived_by.get_full_name', read_only=True)

    class Meta:
        model = Evidence
        fields = [
            'id', 'college', 'department', 'department_name', 'department_code',
            'faculty', 'faculty_name', 'faculty_email', 'faculty_employee_id',
            'academic_year', 'academic_year_name', 'activity', 'activity_type',
            'title', 'description', 'category', 'tags',
            'organizer', 'location', 'start_date', 'end_date', 'duration',
            'certificate_number', 'activity_status',
            'document', 'document_details', 'documents_count',
            'is_verified', 'verified_at', 'status',
            'archived_at', 'archived_by', 'archived_by_name', 'archive_reason',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'verified_at']

    def get_documents_count(self, obj):
        if obj.activity:
            return obj.activity.documents.filter(status='ACTIVE').count()
        return 1 if obj.document else 0


class EvidenceDetailSerializer(EvidenceListSerializer):
    """
    Rich detail serializer with full multi-document gallery and audit logs.
    """
    supporting_documents = serializers.SerializerMethodField()
    verification_logs = serializers.SerializerMethodField()

    class Meta(EvidenceListSerializer.Meta):
        fields = EvidenceListSerializer.Meta.fields + [
            'supporting_documents', 'verification_logs'
        ]

    def get_supporting_documents(self, obj):
        if not obj.activity:
            return []
        docs = obj.activity.documents.filter(status='ACTIVE').order_by('-is_primary', '-created_at')
        return DocumentSerializer(docs, many=True, context=self.context).data

    def get_verification_logs(self, obj):
        if not obj.activity or not hasattr(obj.activity, 'verification_record'):
            return []
        v_rec = obj.activity.verification_record
        logs = v_rec.logs.select_related('actor').order_by('created_at')
        return [
            {
                'id': str(log.id),
                'actor_name': log.actor.get_full_name() if log.actor else 'System',
                'role': log.role,
                'action': log.action,
                'previous_status': log.previous_status,
                'new_status': log.new_status,
                'comment': log.comment,
                'created_at': log.created_at.isoformat()
            } for log in logs
        ]


EvidenceSerializer = EvidenceListSerializer
