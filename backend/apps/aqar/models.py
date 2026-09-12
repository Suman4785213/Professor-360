"""
AQAR & SSR Compliance Workspace models — Phase 8
Centralized management of narrative drafts, structured data requests, version history, and preparation checklists.
"""
import uuid
from django.db import models
from django.utils import timezone


class ComplianceWorkspaceType(models.TextChoices):
    AQAR = 'AQAR', 'Annual Quality Assurance Report (AQAR)'
    SSR = 'SSR', 'Self Study Report (SSR)'


class ComplianceNarrativeStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    READY_FOR_REVIEW = 'READY_FOR_REVIEW', 'Ready for Review'
    REVISION_REQUIRED = 'REVISION_REQUIRED', 'Revision Required'
    APPROVED = 'APPROVED', 'Approved by IQAC'
    LOCKED = 'LOCKED', 'Locked / Final'


class ComplianceNarrative(models.Model):
    """
    Narrative qualitative response for an AQAR/SSR Metric or Section.
    Strictly governed by IQAC review and approval with source evidence traceability.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='compliance_narratives'
    )
    workspace_type = models.CharField(
        max_length=20,
        choices=ComplianceWorkspaceType.choices,
        default=ComplianceWorkspaceType.AQAR,
        db_index=True
    )
    academic_year = models.ForeignKey(
        'academic_years.AcademicYear',
        on_delete=models.CASCADE,
        related_name='compliance_narratives'
    )
    metric = models.ForeignKey(
        'criteria.Metric',
        on_delete=models.CASCADE,
        related_name='narratives'
    )
    narrative_text = models.TextField(
        blank=True,
        help_text="Official qualitative response text supporting the metric"
    )
    status = models.CharField(
        max_length=30,
        choices=ComplianceNarrativeStatus.choices,
        default=ComplianceNarrativeStatus.DRAFT,
        db_index=True
    )
    author = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='drafted_compliance_narratives'
    )
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_compliance_narratives'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    is_ai_drafted = models.BooleanField(
        default=False,
        help_text="Flag indicating whether text was initially drafted via AI assistance"
    )
    ai_model = models.CharField(max_length=100, blank=True)
    version = models.PositiveIntegerField(default=1)
    source_evidence = models.ManyToManyField(
        'evidence.Evidence',
        blank=True,
        related_name='narrative_citations',
        help_text="Explicit verified evidence records cited as source for this narrative"
    )
    review_comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'aqar_compliancenarrative'
        unique_together = [('college', 'workspace_type', 'academic_year', 'metric')]
        ordering = ['metric__display_order', 'metric__number']
        indexes = [
            models.Index(fields=['college', 'workspace_type', 'academic_year']),
            models.Index(fields=['metric', 'status']),
        ]

    def __str__(self):
        return f"{self.workspace_type} Metric {self.metric.number} Narrative (v{self.version}) - {self.status}"


class ComplianceNarrativeVersion(models.Model):
    """
    Historical snapshot of narrative revisions preserving prior values, user, and reason.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    narrative = models.ForeignKey(
        ComplianceNarrative,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.PositiveIntegerField()
    narrative_text = models.TextField()
    status = models.CharField(max_length=30, default='DRAFT')
    edited_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='narrative_version_edits'
    )
    change_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'aqar_compliancenarrativeversion'
        ordering = ['-version_number']
        unique_together = [('narrative', 'version_number')]

    def __str__(self):
        return f"{self.narrative.metric.number} v{self.version_number} by {self.edited_by}"


class DataRequestPriority(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    URGENT = 'URGENT', 'Urgent'


class DataRequestStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    SUBMITTED = 'SUBMITTED', 'Submitted for Review'
    VERIFIED = 'VERIFIED', 'Verified & Accepted'
    REJECTED = 'REJECTED', 'Returned / Rejected'
    CLOSED = 'CLOSED', 'Closed'


class DataRequest(models.Model):
    """
    Official IQAC Request for Missing Information/Evidence (Section 11).
    Lifecycle: IQAC creates -> Department/Faculty notified -> Submits -> Verification -> Metric updated.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='data_requests'
    )
    workspace_type = models.CharField(
        max_length=20,
        choices=ComplianceWorkspaceType.choices,
        default=ComplianceWorkspaceType.AQAR
    )
    metric = models.ForeignKey(
        'criteria.Metric',
        on_delete=models.CASCADE,
        related_name='data_requests'
    )
    academic_year = models.ForeignKey(
        'academic_years.AcademicYear',
        on_delete=models.CASCADE,
        related_name='data_requests'
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='compliance_data_requests'
    )
    assigned_to = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_data_requests'
    )
    requested_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='initiated_data_requests'
    )
    title = models.CharField(max_length=300)
    description = models.TextField()
    required_evidence_type = models.CharField(max_length=200, blank=True)
    due_date = models.DateField(null=True, blank=True)
    priority = models.CharField(
        max_length=20,
        choices=DataRequestPriority.choices,
        default=DataRequestPriority.MEDIUM
    )
    status = models.CharField(
        max_length=30,
        choices=DataRequestStatus.choices,
        default=DataRequestStatus.OPEN,
        db_index=True
    )
    response_evidence = models.ForeignKey(
        'evidence.Evidence',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submitted_data_requests'
    )
    submission_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'aqar_datarequest'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['college', 'status']),
            models.Index(fields=['department', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['metric', 'status']),
        ]

    def __str__(self):
        return f"[{self.status}] {self.title} (Metric {self.metric.number})"


class TaskPriority(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    URGENT = 'URGENT', 'Urgent'


class TaskStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    COMPLETED = 'COMPLETED', 'Completed'
    OVERDUE = 'OVERDUE', 'Overdue'


class PreparationChecklistItem(models.Model):
    """
    Preparation task and checklist item for institutional compliance tracking (Sections 22 & 23).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='compliance_checklist_items'
    )
    workspace_type = models.CharField(
        max_length=20,
        choices=ComplianceWorkspaceType.choices,
        default=ComplianceWorkspaceType.AQAR
    )
    academic_year = models.ForeignKey(
        'academic_years.AcademicYear',
        on_delete=models.CASCADE,
        related_name='compliance_checklist_items'
    )
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_compliance_tasks'
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='compliance_tasks'
    )
    metric = models.ForeignKey(
        'criteria.Metric',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='preparation_tasks'
    )
    due_date = models.DateField(null=True, blank=True)
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM
    )
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.PENDING,
        db_index=True
    )
    is_system_item = models.BooleanField(
        default=False,
        help_text="Standard 10-step institutional readiness checklist item"
    )
    display_order = models.IntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_compliance_tasks'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'aqar_preparationchecklistitem'
        ordering = ['display_order', 'due_date', 'title']
        indexes = [
            models.Index(fields=['college', 'workspace_type', 'academic_year']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"[{self.status}] {self.title}"
