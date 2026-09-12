"""
Notifications & Workflow Automation Models — Phase 10
Extends Notification, introduces IQACTask, TaskActivity, TaskComment,
NotificationPreference, NotificationTemplate, and AutomationRule.
"""
import uuid
from django.db import models
from django.utils import timezone


class NotificationCategory(models.TextChoices):
    VERIFICATION = 'VERIFICATION', 'Verification'
    EVIDENCE = 'EVIDENCE', 'Evidence'
    DATA_REQUEST = 'DATA_REQUEST', 'Data Request'
    METRIC = 'METRIC', 'Metric'
    AQAR = 'AQAR', 'AQAR'
    SSR = 'SSR', 'SSR'
    TASK = 'TASK', 'Task'
    DEADLINE = 'DEADLINE', 'Deadline'
    REPORT = 'REPORT', 'Report'
    AI = 'AI', 'AI Intelligence'
    SYSTEM = 'SYSTEM', 'System'


class NotificationPriority(models.TextChoices):
    LOW = 'LOW', 'Low'
    NORMAL = 'NORMAL', 'Normal'
    HIGH = 'HIGH', 'High'
    URGENT = 'URGENT', 'Urgent'


class TaskStatus(models.TextChoices):
    TODO = 'TODO', 'To Do'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    BLOCKED = 'BLOCKED', 'Blocked'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'


class TaskPriority(models.TextChoices):
    LOW = 'LOW', 'Low'
    NORMAL = 'NORMAL', 'Normal'
    HIGH = 'HIGH', 'High'
    URGENT = 'URGENT', 'Urgent'


class TaskActivityAction(models.TextChoices):
    CREATED = 'CREATED', 'Created'
    ASSIGNED = 'ASSIGNED', 'Assigned'
    STARTED = 'STARTED', 'Started'
    UPDATED = 'UPDATED', 'Updated'
    COMMENTED = 'COMMENTED', 'Commented'
    COMPLETED = 'COMPLETED', 'Completed'
    REOPENED = 'REOPENED', 'Reopened'
    CANCELLED = 'CANCELLED', 'Cancelled'
    ESCALATED = 'ESCALATED', 'Escalated'


class Notification(models.Model):
    """
    Centralized event-driven institutional notification record.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        db_index=True
    )
    recipient = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True
    )
    sender = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_notifications'
    )
    category = models.CharField(
        max_length=30,
        choices=NotificationCategory.choices,
        default=NotificationCategory.SYSTEM,
        db_index=True
    )
    notification_type = models.CharField(max_length=50, db_index=True)
    title = models.CharField(max_length=300)
    body = models.TextField()
    priority = models.CharField(
        max_length=20,
        choices=NotificationPriority.choices,
        default=NotificationPriority.NORMAL,
        db_index=True
    )
    action_url = models.CharField(max_length=300, blank=True)
    action_label = models.CharField(max_length=100, blank=True)
    deduplication_key = models.CharField(max_length=255, blank=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    related_model = models.CharField(max_length=50, blank=True)
    related_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'notifications_notification'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
            models.Index(fields=['college', 'category', '-created_at']),
        ]

    def __str__(self):
        return f"[{self.category}|{self.priority}] → {self.recipient.email}: {self.title}"


class NotificationPreference(models.Model):
    """
    User notification delivery and category preferences.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='user_notification_preferences'
    )
    # Channels
    in_app_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    whatsapp_enabled = models.BooleanField(default=False)
    push_enabled = models.BooleanField(default=False)

    # Category Subscriptions
    category_verification = models.BooleanField(default=True)
    category_tasks = models.BooleanField(default=True)
    category_deadlines = models.BooleanField(default=True)
    category_aqar_ssr = models.BooleanField(default=True)
    category_reports = models.BooleanField(default=True)
    category_system = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notifications_preference'

    def __str__(self):
        return f"Preferences ({self.user.email})"


class NotificationTemplate(models.Model):
    """
    Configurable message templates with variable interpolation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notification_templates'
    )
    code = models.CharField(max_length=100, db_index=True)
    category = models.CharField(
        max_length=30,
        choices=NotificationCategory.choices,
        default=NotificationCategory.SYSTEM
    )
    title_template = models.CharField(max_length=300)
    body_template = models.TextField()
    default_priority = models.CharField(
        max_length=20,
        choices=NotificationPriority.choices,
        default=NotificationPriority.NORMAL
    )
    action_url_template = models.CharField(max_length=300, blank=True)
    action_label = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'notifications_template'
        unique_together = ('college', 'code')

    def __str__(self):
        return f"Template [{self.code}] ({self.category})"


class IQACTask(models.Model):
    """
    Lightweight IQAC task and action item.
    Assigned to users or departments with strict workflow linkage.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='iqac_tasks',
        db_index=True
    )
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='assigned_tasks',
        db_index=True
    )
    creator = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_tasks'
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='department_tasks',
        db_index=True
    )
    academic_year = models.ForeignKey(
        'academic_years.AcademicYear',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='academic_tasks'
    )
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.NORMAL,
        db_index=True
    )
    due_date = models.DateField(null=True, blank=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.TODO,
        db_index=True
    )

    # Workflow Linkages
    related_metric = models.ForeignKey(
        'criteria.Metric',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    related_evidence = models.ForeignKey(
        'evidence.Evidence',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    related_data_request = models.ForeignKey(
        'aqar.DataRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )

    deduplication_key = models.CharField(max_length=255, blank=True, db_index=True)
    is_automated = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_tasks'
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notifications_iqactask'
        ordering = ['due_date', '-created_at']
        indexes = [
            models.Index(fields=['college', 'owner', 'status']),
            models.Index(fields=['college', 'department', 'status']),
            models.Index(fields=['college', 'due_date', 'status']),
        ]

    def __str__(self):
        return f"Task [{self.status}|{self.priority}] {self.title} → {self.owner.email}"

    @property
    def is_overdue(self):
        if self.due_date and self.status not in (TaskStatus.COMPLETED, TaskStatus.CANCELLED):
            return self.due_date < timezone.now().date()
        return False


class TaskActivity(models.Model):
    """
    Chronological audit timeline of task transitions and updates.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        IQACTask,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    actor = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    action = models.CharField(
        max_length=30,
        choices=TaskActivityAction.choices,
        default=TaskActivityAction.UPDATED
    )
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications_taskactivity'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.task.title} - {self.action} by {self.actor.email if self.actor else 'System'}"


class TaskComment(models.Model):
    """
    Discussion comments attached to a task.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        IQACTask,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='task_comments'
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications_taskcomment'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.email} on {self.task.title}"


class AutomationRule(models.Model):
    """
    Configurable workflow automation and escalation rules.
    Automation is strictly non-mutating on verifications.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='automation_rules'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    trigger = models.CharField(max_length=100, db_index=True)
    condition = models.JSONField(default=dict, blank=True)
    action = models.CharField(max_length=100)
    action_config = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    cooldown_hours = models.IntegerField(default=24)
    last_triggered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notifications_automationrule'
        ordering = ['-created_at']

    def __str__(self):
        return f"Rule: {self.name} ({self.trigger} → {self.action})"
