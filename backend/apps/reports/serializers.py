"""
Serializers for Reports app — Phase 6: Automated Report Generation Engine
"""
from rest_framework import serializers
from .models import ReportType, ReportTemplate, ReportTemplateVersion, GeneratedReport, ReportFormat


class ReportTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportType
        fields = [
            'id',
            'name',
            'code',
            'description',
            'default_format',
            'category_code',
            'display_order',
            'is_active',
            'created_at',
            'updated_at',
        ]


class ReportTemplateVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = ReportTemplateVersion
        fields = [
            'id',
            'version_number',
            'file',
            'change_summary',
            'created_by_name',
            'created_at',
        ]


class ReportTemplateSerializer(serializers.ModelSerializer):
    report_type_name = serializers.CharField(source='report_type.name', read_only=True)
    report_type_code = serializers.CharField(source='report_type.code', read_only=True)
    versions = ReportTemplateVersionSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    is_active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = ReportTemplate
        fields = [
            'id',
            'college',
            'report_type',
            'report_type_name',
            'report_type_code',
            'name',
            'file_format',
            'file',
            'version',
            'is_active',
            'versions',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['college', 'version', 'created_by', 'created_at', 'updated_at']


class GeneratedReportListSerializer(serializers.ModelSerializer):
    report_type_name = serializers.CharField(source='report_type.name', read_only=True)
    report_type_code = serializers.CharField(source='report_type.code', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True, default='')
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True, default='')
    department_name = serializers.CharField(source='department.name', read_only=True, default='')
    generated_by_name = serializers.CharField(source='generated_by.get_full_name', read_only=True, default='')
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = GeneratedReport
        fields = [
            'id',
            'title',
            'report_type',
            'report_type_name',
            'report_type_code',
            'template',
            'template_name',
            'template_version',
            'academic_year',
            'academic_year_name',
            'department',
            'department_name',
            'record_count',
            'output_format',
            'status',
            'file_size',
            'error_message',
            'generated_by_name',
            'generated_at',
            'download_url',
        ]

    def get_download_url(self, obj):
        if obj.file and obj.status == 'COMPLETED':
            return f"/api/reports/{obj.id}/download/"
        return None


class ReportFilterRequestSerializer(serializers.Serializer):
    """
    Validates report generation and preview parameters (Section 4 & 38).
    """
    report_type = serializers.UUIDField(required=True)
    academic_year = serializers.UUIDField(required=False, allow_null=True)
    department = serializers.UUIDField(required=False, allow_null=True)
    faculty = serializers.UUIDField(required=False, allow_null=True)
    category = serializers.UUIDField(required=False, allow_null=True)
    criterion = serializers.UUIDField(required=False, allow_null=True)
    metric = serializers.UUIDField(required=False, allow_null=True)
    date_from = serializers.DateField(required=False, allow_null=True)
    date_to = serializers.DateField(required=False, allow_null=True)
    search = serializers.CharField(required=False, allow_blank=True, max_length=100)


class ReportGenerateRequestSerializer(ReportFilterRequestSerializer):
    output_format = serializers.ChoiceField(choices=ReportFormat.choices, required=False)
    template = serializers.UUIDField(required=False, allow_null=True)
