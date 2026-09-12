"""
External Integrations & Communication Platform Models — Phase 16
Manages email templates, delivery logging & retries, announcements,
SSO configuration, calendar sync, storage migration, and incoming webhooks.
"""
import uuid
from django.db import models
from django.utils import timezone


class EmailDeliveryStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    SENT = 'SENT', 'Sent'
    FAILED = 'FAILED', 'Failed'
    RETRYING = 'RETRYING', 'Retrying'


class AnnouncementPriority(models.TextChoices):
    LOW = 'LOW', 'Low'
    NORMAL = 'NORMAL', 'Normal'
    HIGH = 'HIGH', 'High'
    URGENT = 'URGENT', 'Urgent'


class AnnouncementAudience(models.TextChoices):
    ENTIRE_COLLEGE = 'ENTIRE_COLLEGE', 'Entire College'
    DEPARTMENT = 'DEPARTMENT', 'Specific Department'
    ROLE = 'ROLE', 'Specific Role'
    ACADEMIC_YEAR = 'ACADEMIC_YEAR', 'Specific Academic Year'


class SSOProviderType(models.TextChoices):
    OIDC = 'OIDC', 'OpenID Connect (OIDC)'
    SAML = 'SAML', 'SAML 2.0'
    OAUTH2 = 'OAUTH2', 'OAuth 2.0'


class SSOStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'
    TESTING = 'TESTING', 'Testing'


class EmailTemplate(models.Model):
    """
    Configurable email templates with safe variable placeholders.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='email_templates',
        help_text="Null represents platform-standard default template",
    )
    name = models.CharField(max_length=150)
    event = models.CharField(max_length=100, db_index=True)
    subject = models.CharField(max_length=255)
    body = models.TextField(help_text="Body content with {{variable}} placeholders")
    variables = models.JSONField(default=list, blank=True, help_text="Allowed variable names")
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'integrations_emailtemplate'
        ordering = ['name', '-version']

    def __str__(self):
        return f"{self.name} ({self.event})"


class EmailDeliveryLog(models.Model):
    """
    Audit log of email dispatches with delivery status and retry management.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='email_delivery_logs',
        db_index=True,
    )
    recipient = models.EmailField(db_index=True)
    event = models.CharField(max_length=100, db_index=True)
    template = models.ForeignKey(
        EmailTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deliveries',
    )
    subject = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20,
        choices=EmailDeliveryStatus.choices,
        default=EmailDeliveryStatus.PENDING,
        db_index=True,
    )
    attempt_count = models.PositiveIntegerField(default=1)
    max_attempts = models.PositiveIntegerField(default=3)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    provider = models.CharField(max_length=50, default='mock')
    provider_response = models.TextField(blank=True)
    error_code = models.CharField(max_length=100, blank=True)
    deduplication_key = models.CharField(max_length=255, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'integrations_emaildeliverylog'
        ordering = ['-created_at']

    def __str__(self):
        return f"Email {self.event} -> {self.recipient} [{self.status}]"


class Announcement(models.Model):
    """
    Institutional announcements targeted by college, department, role, or academic year.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='announcements',
        db_index=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    priority = models.CharField(
        max_length=20,
        choices=AnnouncementPriority.choices,
        default=AnnouncementPriority.NORMAL,
    )
    audience_type = models.CharField(
        max_length=30,
        choices=AnnouncementAudience.choices,
        default=AnnouncementAudience.ENTIRE_COLLEGE,
    )
    target_department = models.ForeignKey(
        'departments.Department',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='department_announcements',
    )
    target_role = models.CharField(max_length=50, blank=True)
    target_academic_year = models.ForeignKey(
        'academic_years.AcademicYear',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='academic_year_announcements',
    )
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField()
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_announcements',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'integrations_announcement'
        ordering = ['-start_date', '-created_at']

    def __str__(self):
        return f"Announcement [{self.priority}] {self.title} ({self.college.code})"

    @property
    def is_current(self):
        today = timezone.now().date()
        return self.is_active and (self.start_date <= today <= self.end_date)


class SSOConfiguration(models.Model):
    """
    Tenant-scoped enterprise Single Sign-On (SSO) configuration.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.OneToOneField(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='sso_config',
    )
    sso_enabled = models.BooleanField(default=False)
    provider_type = models.CharField(
        max_length=20,
        choices=SSOProviderType.choices,
        default=SSOProviderType.OIDC,
    )
    client_id = models.CharField(max_length=255, blank=True)
    encrypted_client_secret = models.CharField(max_length=500, blank=True)
    issuer_url = models.URLField(blank=True, help_text="Discovery URL or IdP metadata endpoint")
    allowed_domains = models.JSONField(default=list, blank=True, help_text="e.g. ['ait.edu']")
    status = models.CharField(
        max_length=20,
        choices=SSOStatus.choices,
        default=SSOStatus.INACTIVE,
    )
    last_verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'integrations_ssoconfiguration'

    def __str__(self):
        return f"SSO {self.college.code} ({self.provider_type}) - {'Active' if self.sso_enabled else 'Disabled'}"


class CalendarSyncRecord(models.Model):
    """
    Tracks synchronized or exported institutional calendar items (tasks, review meetings, milestones).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='calendar_sync_records',
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='calendar_events',
    )
    event_type = models.CharField(max_length=50)  # TASK_DEADLINE, REVIEW_MEETING, AQAR_MILESTONE
    entity_id = models.UUIDField(null=True, blank=True)
    summary = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    uid = models.CharField(max_length=255, unique=True)
    sync_status = models.CharField(max_length=30, default='LOCAL')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'integrations_calendarsyncrecord'

    def __str__(self):
        return f"Calendar {self.summary} [{self.event_type}]"


class IncomingWebhookLog(models.Model):
    """
    Audit log for inbound webhooks received from external systems (ERP, SIS, LMS).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='incoming_webhook_logs',
    )
    source = models.CharField(max_length=100)
    event = models.CharField(max_length=100)
    payload = models.JSONField(default=dict)
    signature = models.CharField(max_length=255, blank=True)
    is_valid = models.BooleanField(default=False)
    status = models.CharField(max_length=30, default='PROCESSED')
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'integrations_incomingwebhooklog'
        ordering = ['-created_at']

    def __str__(self):
        return f"Inbound Webhook {self.source} - {self.event} [{self.status}]"


class StorageMigrationJob(models.Model):
    """
    Tracks batch migration of media assets and evidence files from local storage to S3 cloud storage.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='storage_migrations',
    )
    source_storage = models.CharField(max_length=50, default='LOCAL')
    destination_storage = models.CharField(max_length=50, default='S3')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='PENDING')
    total_files = models.PositiveIntegerField(default=0)
    migrated_files = models.PositiveIntegerField(default=0)
    failed_files = models.PositiveIntegerField(default=0)
    log = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'integrations_storagemigrationjob'
        ordering = ['-created_at']

    def __str__(self):
        return f"Storage Migration {self.college.code} [{self.status}] ({self.migrated_files}/{self.total_files})"
