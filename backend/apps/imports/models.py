"""
Imports App — Data Models (Phase 14)
Defines ImportJob, ImportTemplate, APIKey, WebhookEndpoint, and WebhookDeliveryLog.
"""
import uuid
from django.db import models
from django.utils import timezone


class ImportDataType(models.TextChoices):
    FACULTY = 'FACULTY', 'Faculty'
    ACTIVITIES = 'ACTIVITIES', 'Activities'
    EVIDENCE_METADATA = 'EVIDENCE_METADATA', 'Evidence Metadata'
    DEPARTMENTS = 'DEPARTMENTS', 'Departments'
    PROGRAMS = 'PROGRAMS', 'Programs'
    ACADEMIC_YEARS = 'ACADEMIC_YEARS', 'Academic Years'


class ImportJobStatus(models.TextChoices):
    UPLOADED = 'UPLOADED', 'Uploaded'
    VALIDATING = 'VALIDATING', 'Validating'
    READY = 'READY', 'Ready for Import'
    IMPORTING = 'IMPORTING', 'Importing'
    COMPLETED = 'COMPLETED', 'Completed'
    COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS', 'Completed with Errors'
    FAILED = 'FAILED', 'Failed'
    CANCELLED = 'CANCELLED', 'Cancelled'


class ImportMode(models.TextChoices):
    INSERT_ONLY = 'INSERT_ONLY', 'Insert Only'
    INSERT_AND_UPDATE = 'INSERT_AND_UPDATE', 'Insert and Update Existing'


class ImportJob(models.Model):
    """
    Tracks state, validation progress, and execution stats of a batch spreadsheet import.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='import_jobs',
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='import_jobs',
    )
    data_type = models.CharField(
        max_length=30,
        choices=ImportDataType.choices,
        db_index=True,
    )
    file = models.FileField(upload_to='imports/%Y/%m/')
    original_filename = models.CharField(max_length=255)
    file_format = models.CharField(max_length=10, default='XLSX')
    status = models.CharField(
        max_length=30,
        choices=ImportJobStatus.choices,
        default=ImportJobStatus.UPLOADED,
        db_index=True,
    )
    mode = models.CharField(
        max_length=30,
        choices=ImportMode.choices,
        default=ImportMode.INSERT_ONLY,
    )

    # Column & Reference Mapping
    column_mapping = models.JSONField(
        default=dict,
        blank=True,
        help_text="Mapping from spreadsheet header to model field name",
    )
    reference_mapping = models.JSONField(
        default=dict,
        blank=True,
        help_text="Mapping of unstandardized names to system UUIDs (e.g. {'CSE': '<uuid>'})",
    )

    # Row metrics
    total_rows = models.PositiveIntegerField(default=0)
    valid_rows = models.PositiveIntegerField(default=0)
    warning_count = models.PositiveIntegerField(default=0)
    error_count = models.PositiveIntegerField(default=0)
    imported_count = models.PositiveIntegerField(default=0)

    # Detailed validation feedback & diagnostic log
    validation_results = models.JSONField(
        default=dict,
        blank=True,
        help_text="Preview rows, errors per row, duplicate tags, and suggested fixes",
    )
    error_report_file = models.FileField(
        upload_to='imports/errors/%Y/%m/',
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'imports_importjob'
        verbose_name = 'Import Job'
        verbose_name_plural = 'Import Jobs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['college', 'data_type', 'status']),
            models.Index(fields=['college', 'created_at']),
        ]

    def __str__(self):
        return f"Import [{self.data_type}] {self.original_filename} ({self.status})"


class ImportTemplate(models.Model):
    """
    Saved column and reference mapping configuration for repeated spreadsheet imports.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='import_templates',
        null=True,
        blank=True,
        help_text="Null for platform-standard templates, or scoped to college",
    )
    name = models.CharField(max_length=150)
    data_type = models.CharField(max_length=30, choices=ImportDataType.choices)
    column_mapping = models.JSONField(default=dict)
    reference_mapping = models.JSONField(default=dict, blank=True)
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_import_templates',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'imports_importtemplate'
        verbose_name = 'Import Template'
        verbose_name_plural = 'Import Templates'
        ordering = ['name', '-version']

    def __str__(self):
        return f"{self.name} v{self.version} ({self.data_type})"


class APIKey(models.Model):
    """
    Tenant-scoped API key credentials for secure external system integration.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='api_keys',
    )
    name = models.CharField(max_length=100)
    key_prefix = models.CharField(max_length=16, db_index=True)
    hashed_secret = models.CharField(max_length=255)
    scopes = models.JSONField(
        default=list,
        help_text="Allowed operation scopes: faculty:read, faculty:write, activities:read, activities:write, evidence:read",
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_api_keys',
    )
    last_used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'imports_apikey'
        verbose_name = 'API Key'
        verbose_name_plural = 'API Keys'
        ordering = ['-created_at']

    def __str__(self):
        return f"APIKey {self.name} ({self.key_prefix}...)"


class WebhookEndpoint(models.Model):
    """
    Outgoing webhook configuration for real-time notification to college ERP/LMS.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='webhook_endpoints',
    )
    url = models.URLField(max_length=500)
    secret = models.CharField(max_length=128, help_text="Shared secret for HMAC-SHA256 signature verification")
    events = models.JSONField(
        default=list,
        help_text="List of subscribed events e.g. ['EVIDENCE_VERIFIED', 'ACTIVITY_CREATED']",
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_webhooks',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'imports_webhookendpoint'
        verbose_name = 'Webhook Endpoint'
        verbose_name_plural = 'Webhook Endpoints'
        ordering = ['-created_at']

    def __str__(self):
        return f"Webhook {self.url} ({self.college.code})"


class WebhookDeliveryLog(models.Model):
    """
    Audit log of dispatched webhook events, status, attempts, and response codes.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('DELIVERED', 'Delivered'),
        ('FAILED', 'Failed'),
        ('RETRYING', 'Retrying'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    endpoint = models.ForeignKey(
        WebhookEndpoint,
        on_delete=models.CASCADE,
        related_name='delivery_logs',
    )
    event = models.CharField(max_length=100)
    payload = models.JSONField(default=dict)
    response_status = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    attempt = models.PositiveIntegerField(default=1)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'imports_webhookdeliverylog'
        verbose_name = 'Webhook Delivery Log'
        verbose_name_plural = 'Webhook Delivery Logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"Delivery {self.event} -> {self.endpoint.url} [{self.status}]"
