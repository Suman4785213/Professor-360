"""
Reports app models — Phase 6: Automated Report Generation Engine
Configurable Report Types, Template Management with Versioning, and Generated Report History.
"""
import uuid
from django.db import models
from core.models import TenantUUIDModel


class ReportFormat(models.TextChoices):
    PDF = 'PDF', 'Portable Document Format (.pdf)'
    EXCEL = 'EXCEL', 'Microsoft Excel (.xlsx)'
    WORD = 'WORD', 'Microsoft Word (.docx)'


class ReportStatus(models.TextChoices):
    GENERATING = 'GENERATING', 'Generating'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'
    ARCHIVED = 'ARCHIVED', 'Archived'


class ReportType(models.Model):
    """
    Catalog of configurable institutional report types (Section 2).
    Can be system defaults (college=None) or institution-customized.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='report_types',
        help_text="Null for global system standard report types"
    )
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=60, db_index=True)
    description = models.TextField(blank=True)
    default_format = models.CharField(
        max_length=20,
        choices=ReportFormat.choices,
        default=ReportFormat.PDF
    )
    category_code = models.CharField(
        max_length=50,
        blank=True,
        help_text="Optional category code restriction (e.g. FDP, WORKSHOP, PUBLICATION)"
    )
    display_order = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name']
        indexes = [
            models.Index(fields=['code', 'is_active']),
            models.Index(fields=['college', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


def template_upload_path(instance, filename):
    cid = instance.college_id or 'global'
    return f"colleges/{cid}/templates/{instance.report_type.code}/{filename}"


class ReportTemplate(models.Model):
    """
    Template for report generation (Word, Excel, or PDF layouts).
    Belongs to a College and ReportType (Section 7 & 10).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='report_templates',
        help_text="Null for system default templates"
    )
    report_type = models.ForeignKey(
        ReportType,
        on_delete=models.CASCADE,
        related_name='templates'
    )
    name = models.CharField(max_length=150)
    file_format = models.CharField(
        max_length=20,
        choices=ReportFormat.choices,
        default=ReportFormat.PDF
    )
    file = models.FileField(
        upload_to=template_upload_path,
        null=True,
        blank=True,
        help_text="Uploaded .docx or layout template file"
    )
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['college', 'report_type', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} (v{self.version}) — {self.report_type.name}"


class ReportTemplateVersion(models.Model):
    """
    Preserves historical template file versions so past reports remain traceable (Section 11).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        ReportTemplate,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.PositiveIntegerField()
    file = models.FileField(upload_to='templates/history/')
    change_summary = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version_number']

    def __str__(self):
        return f"{self.template.name} v{self.version_number}"


def generated_report_upload_path(instance, filename):
    cid = instance.college_id or 'unknown'
    return f"colleges/{cid}/generated_reports/{instance.report_type.code}/{filename}"


class GeneratedReport(TenantUUIDModel):
    """
    Generated report record stored in database with audit and download links (Section 18).
    """
    report_type = models.ForeignKey(
        ReportType,
        on_delete=models.CASCADE,
        related_name='generated_reports'
    )
    template = models.ForeignKey(
        ReportTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_reports'
    )
    template_version = models.PositiveIntegerField(default=1)
    title = models.CharField(max_length=255)

    # Scoping context
    academic_year = models.ForeignKey(
        'academic_years.AcademicYear',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_reports'
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_reports'
    )
    faculty = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='faculty_generated_reports'
    )
    category = models.ForeignKey(
        'activities.ActivityCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_reports'
    )
    criterion = models.ForeignKey(
        'criteria.Criterion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_reports'
    )
    metric = models.ForeignKey(
        'criteria.Metric',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_reports'
    )

    filters_applied = models.JSONField(default=dict, blank=True)
    record_count = models.PositiveIntegerField(default=0)
    output_format = models.CharField(
        max_length=20,
        choices=ReportFormat.choices,
        default=ReportFormat.PDF
    )
    status = models.CharField(
        max_length=20,
        choices=ReportStatus.choices,
        default=ReportStatus.GENERATING,
        db_index=True
    )

    file = models.FileField(
        upload_to=generated_report_upload_path,
        null=True,
        blank=True
    )
    file_size = models.PositiveIntegerField(default=0, help_text="Size in bytes")
    error_message = models.TextField(blank=True)

    generated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='reports_generated'
    )
    generated_at = models.DateTimeField(auto_now_add=True, db_index=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reports_archived'
    )
    archive_reason = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-generated_at']
        indexes = [
            models.Index(fields=['college', 'status', 'generated_at']),
            models.Index(fields=['department', 'generated_at']),
            models.Index(fields=['academic_year', 'generated_at']),
        ]

    def __str__(self):
        return f"{self.title} [{self.output_format}] — {self.status}"
