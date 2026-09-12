"""
Support & Operations Models — Phase 18
Includes Support Tickets, Comments, Attachments, Incidents,
Knowledge Base, Security Events, and Maintenance Settings.
"""
import uuid
from django.db import models
from django.utils import timezone
from django.utils.crypto import get_random_string


class SupportTicketCategory(models.TextChoices):
    LOGIN = 'LOGIN', 'Login'
    BILLING = 'BILLING', 'Billing'
    DATA = 'DATA', 'Data'
    REPORTS = 'REPORTS', 'Reports'
    EVIDENCE = 'EVIDENCE', 'Evidence'
    AI = 'AI', 'AI'
    INTEGRATIONS = 'INTEGRATIONS', 'Integrations'
    PERFORMANCE = 'PERFORMANCE', 'Performance'
    BUG = 'BUG', 'Bug'
    OTHER = 'OTHER', 'Other'


class SupportTicketPriority(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    CRITICAL = 'CRITICAL', 'Critical'


class SupportTicketStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    WAITING_FOR_USER = 'WAITING_FOR_USER', 'Waiting for User'
    RESOLVED = 'RESOLVED', 'Resolved'
    CLOSED = 'CLOSED', 'Closed'


class SLAStatus(models.TextChoices):
    ON_TIME = 'ON_TIME', 'On Time'
    AT_RISK = 'AT_RISK', 'At Risk'
    BREACHED = 'BREACHED', 'Breached'


def generate_ticket_number():
    date_str = timezone.now().strftime('%Y%m')
    random_suffix = get_random_string(4, allowed_chars='0123456789ABCDEF')
    return f"TCK-{date_str}-{random_suffix}"


class SupportTicket(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_number = models.CharField(max_length=32, unique=True, default=generate_ticket_number, db_index=True)
    college = models.ForeignKey('colleges.College', on_delete=models.CASCADE, related_name='support_tickets')
    created_by = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='created_support_tickets')
    category = models.CharField(max_length=30, choices=SupportTicketCategory.choices, default=SupportTicketCategory.OTHER)
    priority = models.CharField(max_length=20, choices=SupportTicketPriority.choices, default=SupportTicketPriority.MEDIUM)
    status = models.CharField(max_length=30, choices=SupportTicketStatus.choices, default=SupportTicketStatus.OPEN, db_index=True)
    sla_status = models.CharField(max_length=20, choices=SLAStatus.choices, default=SLAStatus.ON_TIME, db_index=True)

    subject = models.CharField(max_length=255)
    description = models.TextField()

    assigned_to = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_support_tickets'
    )

    first_responded_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True, default='')

    first_response_due_at = models.DateTimeField(null=True, blank=True)
    resolution_due_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'support_ticket'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['college', 'status']),
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['sla_status']),
        ]

    def __str__(self):
        return f"[{self.ticket_number}] {self.subject} ({self.status})"

    def calculate_sla_status(self) -> str:
        now = timezone.now()
        if self.status in [SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED]:
            if self.resolution_due_at and self.resolved_at and self.resolved_at > self.resolution_due_at:
                return SLAStatus.BREACHED
            return SLAStatus.ON_TIME

        if self.resolution_due_at and now > self.resolution_due_at:
            return SLAStatus.BREACHED

        if not self.first_responded_at and self.first_response_due_at and now > self.first_response_due_at:
            return SLAStatus.BREACHED

        if self.resolution_due_at and (self.resolution_due_at - now).total_seconds() < 4 * 3600:
            return SLAStatus.AT_RISK

        return SLAStatus.ON_TIME


class TicketComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='ticket_comments')
    is_internal = models.BooleanField(default=False)  # Super Admin only internal note
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'support_ticket_comment'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.email} on {self.ticket.ticket_number}"


class TicketAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='attachments')
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    file = models.FileField(upload_to='support_attachments/%Y/%m/')
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=100, default='application/octet-stream')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'support_ticket_attachment'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.file_name} on {self.ticket.ticket_number}"


class IncidentStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    INVESTIGATING = 'INVESTIGATING', 'Investigating'
    MITIGATED = 'MITIGATED', 'Mitigated'
    RESOLVED = 'RESOLVED', 'Resolved'
    CLOSED = 'CLOSED', 'Closed'


class IncidentSeverity(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    CRITICAL = 'CRITICAL', 'Critical'


class Incident(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    severity = models.CharField(max_length=20, choices=IncidentSeverity.choices, default=IncidentSeverity.MEDIUM)
    status = models.CharField(max_length=20, choices=IncidentStatus.choices, default=IncidentStatus.OPEN, db_index=True)
    description = models.TextField()
    affects_all_tenants = models.BooleanField(default=True)
    affected_tenants = models.ManyToManyField('colleges.College', blank=True, related_name='incidents')
    started_at = models.DateTimeField(default=timezone.now)
    mitigated_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution = models.TextField(blank=True, default='')
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'support_incident'
        ordering = ['-started_at']

    def __str__(self):
        return f"[{self.severity}] {self.title} ({self.status})"


class KnowledgeBaseCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'support_kb_category'
        ordering = ['order', 'name']
        verbose_name_plural = 'Knowledge Base Categories'

    def __str__(self):
        return self.name


class KnowledgeBaseArticle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(KnowledgeBaseCategory, on_delete=models.CASCADE, related_name='articles')
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    content = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=[('DRAFT', 'Draft'), ('PUBLISHED', 'Published')],
        default='PUBLISHED',
        db_index=True
    )
    view_count = models.IntegerField(default=0)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'support_kb_article'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.status})"


class SecurityEventType(models.TextChoices):
    FAILED_LOGIN = 'FAILED_LOGIN', 'Failed Login'
    PERMISSION_FAILURE = 'PERMISSION_FAILURE', 'Permission Failure'
    CROSS_TENANT_ACCESS = 'CROSS_TENANT_ACCESS', 'Cross-Tenant Access Attempt'
    API_AUTH_FAILURE = 'API_AUTH_FAILURE', 'API Authentication Failure'
    RATE_LIMIT_VIOLATION = 'RATE_LIMIT_VIOLATION', 'Rate-Limit Violation'
    WEBHOOK_FAILURE = 'WEBHOOK_FAILURE', 'Webhook Failure'
    FILE_SECURITY_FAILURE = 'FILE_SECURITY_FAILURE', 'File Security Failure'


class SecurityEventSeverity(models.TextChoices):
    INFO = 'INFO', 'Info'
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    CRITICAL = 'CRITICAL', 'Critical'


class SecurityEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=50, choices=SecurityEventType.choices, db_index=True)
    severity = models.CharField(max_length=20, choices=SecurityEventSeverity.choices, default=SecurityEventSeverity.MEDIUM, db_index=True)
    college = models.ForeignKey('colleges.College', null=True, blank=True, on_delete=models.SET_NULL, related_name='security_events')
    user = models.ForeignKey('accounts.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='security_events')
    user_email = models.CharField(max_length=255, blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    path = models.CharField(max_length=500, blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'support_security_event'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.severity}] {self.event_type} - {self.user_email or 'Anonymous'} at {self.created_at}"


class SystemMaintenanceSetting(models.Model):
    """Singleton record managing global platform maintenance mode."""
    is_enabled = models.BooleanField(default=False)
    reason = models.CharField(max_length=255, blank=True, default='Scheduled system maintenance and upgrades.')
    estimated_duration_minutes = models.IntegerField(default=60)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'support_maintenance_setting'

    @classmethod
    def get_setting(cls):
        obj, _ = cls.objects.get_or_create(id=1)
        return obj
