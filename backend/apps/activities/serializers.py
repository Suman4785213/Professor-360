import hashlib
from rest_framework import serializers
from .models import Activity, ActivityCategory, Document, DocumentCategory


class ActivityCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityCategory
        fields = ['id', 'college', 'name', 'code', 'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class DocumentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentCategory
        fields = ['id', 'college', 'name', 'code', 'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_code = serializers.CharField(source='category.code', read_only=True)
    preview_url = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'activity', 'college', 'department', 'uploaded_by', 'uploaded_by_name',
            'category', 'category_name', 'category_code', 'description', 'version',
            'replaced_by', 'is_current', 'document_type', 'file', 'file_name',
            'original_filename', 'file_size', 'mime_type', 'file_hash', 'is_primary',
            'status', 'preview_url', 'download_url', 'uploaded_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'college', 'department', 'uploaded_by', 'file_hash', 'file_size', 'mime_type', 'uploaded_at', 'created_at', 'updated_at']

    def get_preview_url(self, obj):
        return f"/api/documents/{obj.id}/preview/"

    def get_download_url(self, obj):
        return f"/api/documents/{obj.id}/download/"

    def validate_file(self, value):
        # 10MB maximum size limit
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("File size must not exceed 10 MB.")

        # Allowed extensions / mime types
        name = value.name.lower()
        allowed_exts = ('.pdf', '.jpg', '.jpeg', '.png')
        if not any(name.endswith(ext) for ext in allowed_exts):
            raise serializers.ValidationError("Only PDF, JPG, JPEG, and PNG files are accepted.")
        return value


class ActivitySerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_code = serializers.CharField(source='category.code', read_only=True)
    faculty_name = serializers.CharField(source='faculty.get_full_name', read_only=True)
    faculty_email = serializers.CharField(source='faculty.email', read_only=True)
    faculty_employee_id = serializers.CharField(source='faculty.employee_id', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_code = serializers.CharField(source='department.code', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    is_editable = serializers.BooleanField(read_only=True)
    is_verified = serializers.BooleanField(read_only=True)
    verification_details = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            'id', 'college', 'department', 'department_name', 'department_code',
            'faculty', 'faculty_name', 'faculty_email', 'faculty_employee_id',
            'academic_year', 'academic_year_name',
            'category', 'category_name', 'category_code',
            'title', 'activity_type', 'organizer', 'venue', 'location',
            'start_date', 'end_date', 'duration', 'duration_days', 'duration_hours',
            'description', 'additional_remarks', 'is_online', 'certificate_number',
            'status', 'last_rejection_reason', 'last_rejected_by_role', 'last_rejected_at',
            'is_editable', 'is_verified', 'documents', 'verification_details',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'college', 'faculty', 'department', 'status',
            'last_rejection_reason', 'last_rejected_by_role', 'last_rejected_at',
            'created_at', 'updated_at'
        ]

    def get_verification_details(self, obj):
        if hasattr(obj, 'verification_record'):
            rec = obj.verification_record
            return {
                'id': str(rec.id),
                'current_status': rec.current_status,
                'incharge_verified_by': rec.incharge_verified_by.get_full_name() if rec.incharge_verified_by else None,
                'incharge_verified_at': rec.incharge_verified_at,
                'incharge_comment': rec.incharge_comment,
                'hod_approved_by': rec.hod_approved_by.get_full_name() if rec.hod_approved_by else None,
                'hod_approved_at': rec.hod_approved_at,
                'hod_comment': rec.hod_comment,
                'iqac_verified_by': rec.iqac_verified_by.get_full_name() if rec.iqac_verified_by else None,
                'iqac_verified_at': rec.iqac_verified_at,
                'iqac_comment': rec.iqac_comment,
            }
        return None
