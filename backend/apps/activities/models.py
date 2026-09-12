"""
Activities — Activity, ActivityCategory, and Document Models
"""
import uuid
from django.db import models


class ActivityType(models.TextChoices):
    FDP = 'FDP', 'Faculty Development Program'
    WORKSHOP = 'WORKSHOP', 'Workshop'
    SEMINAR = 'SEMINAR', 'Seminar'
    CONFERENCE = 'CONFERENCE', 'Conference'
    CERTIFICATION = 'CERTIFICATION', 'Certification'
    PUBLICATION = 'PUBLICATION', 'Publication'
    RESEARCH = 'RESEARCH', 'Research'
    TRAINING = 'TRAINING', 'Training'
    ACHIEVEMENT = 'ACHIEVEMENT', 'Achievement'
    AWARD = 'AWARD', 'Award'
    OTHER = 'OTHER', 'Other'


class ActivityStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    PENDING_INCHARGE = 'PENDING_INCHARGE', 'Pending In-charge Verification'
    INCHARGE_VERIFIED = 'INCHARGE_VERIFIED', 'In-charge Verified'
    PENDING_HOD = 'PENDING_HOD', 'Pending HOD Approval'
    HOD_APPROVED = 'HOD_APPROVED', 'HOD Approved'
    PENDING_IQAC = 'PENDING_IQAC', 'Pending IQAC Verification'
    IQAC_VERIFIED = 'IQAC_VERIFIED', 'IQAC Verified'
    VERIFIED_EVIDENCE = 'VERIFIED_EVIDENCE', 'Verified Evidence'
    RETURNED_TO_FACULTY = 'RETURNED_TO_FACULTY', 'Returned to Faculty'
    RETURNED_TO_INCHARGE = 'RETURNED_TO_INCHARGE', 'Returned to In-charge'
    REJECTED_INCHARGE = 'REJECTED_INCHARGE', 'Rejected by In-charge'
    REJECTED_HOD = 'REJECTED_HOD', 'Rejected by HOD'
    REJECTED_IQAC = 'REJECTED_IQAC', 'Rejected by IQAC'


class DocumentType(models.TextChoices):
    CERTIFICATE = 'CERTIFICATE', 'Certificate'
    SUPPORTING = 'SUPPORTING', 'Supporting Document'
    OTHER = 'OTHER', 'Other'


class ActivityCategory(models.Model):
    """
    Configurable activity categories stored in the database.
    Can be system defaults (college=None) or customized per college.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='activity_categories',
        help_text="Null for global system defaults, or institution-specific"
    )
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'activities_activitycategory'
        verbose_name = 'Activity Category'
        verbose_name_plural = 'Activity Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class DocumentCategory(models.Model):
    """
    Configurable document categories (e.g. Certificate, Attendance, Report, Photographs, etc.)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='document_categories',
        help_text="Null for global system defaults, or institution-specific"
    )
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'activities_documentcategory'
        verbose_name = 'Document Category'
        verbose_name_plural = 'Document Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Activity(models.Model):
    """
    Core entity representing a faculty activity (FDP, workshop, etc.)
    with its complete verification lifecycle.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='activities',
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.CASCADE,
        related_name='activities',
    )
    faculty = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='activities',
    )
    academic_year = models.ForeignKey(
        'academic_years.AcademicYear',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activities',
    )

    category = models.ForeignKey(
        ActivityCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activities',
    )

    # Activity details
    title = models.CharField(max_length=300)
    activity_type = models.CharField(max_length=50, choices=ActivityType.choices, blank=True)
    organizer = models.CharField(max_length=200, blank=True)
    venue = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=200, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    duration = models.CharField(max_length=100, blank=True)
    duration_days = models.PositiveIntegerField(null=True, blank=True)
    duration_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True)
    additional_remarks = models.TextField(blank=True)
    is_online = models.BooleanField(default=False)
    certificate_number = models.CharField(max_length=100, blank=True)

    # Verification state
    status = models.CharField(
        max_length=30,
        choices=ActivityStatus.choices,
        default=ActivityStatus.DRAFT,
        db_index=True,
    )

    # Rejection & correction tracking
    last_rejection_reason = models.TextField(blank=True)
    last_rejected_by_role = models.CharField(max_length=30, blank=True)
    last_rejected_at = models.DateTimeField(null=True, blank=True)

    # Phase 14: Origin & Integration Tracking
    source = models.CharField(
        max_length=50,
        default='MANUAL',
        db_index=True,
        help_text="Origin of the record: MANUAL, IMPORT, or API"
    )
    import_job_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Reference to the ImportJob if imported"
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'activities_activity'
        verbose_name = 'Activity'
        verbose_name_plural = 'Activities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['college', 'department', 'status']),
            models.Index(fields=['faculty', 'status']),
            models.Index(fields=['academic_year', 'status']),
        ]

    def __str__(self):
        return f"{self.title} — {self.faculty.get_full_name() if self.faculty else 'Unknown'}"

    @property
    def is_editable(self):
        """Faculty can edit when in DRAFT or any RETURNED / REJECTED state."""
        return self.status in (
            ActivityStatus.DRAFT,
            ActivityStatus.RETURNED_TO_FACULTY,
            ActivityStatus.REJECTED_INCHARGE,
            ActivityStatus.REJECTED_HOD,
            ActivityStatus.REJECTED_IQAC,
        )

    @property
    def is_verified(self):
        return self.status in (ActivityStatus.IQAC_VERIFIED, ActivityStatus.VERIFIED_EVIDENCE)


def activity_document_upload_path(instance, filename):
    """Generate upload path: colleges/{college_id}/activities/{activity_id}/certificates/{filename}"""
    doc_type = instance.document_type.lower()
    return f"colleges/{instance.college_id}/activities/{instance.activity_id}/{doc_type}s/{filename}"


class Document(models.Model):
    """
    File uploaded as evidence for an activity (certificate, supporting doc, etc.)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    activity = models.ForeignKey(
        Activity,
        on_delete=models.CASCADE,
        related_name='documents',
    )
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='documents',
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents',
    )
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_documents',
    )

    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices,
        default=DocumentType.CERTIFICATE,
    )
    file = models.FileField(upload_to=activity_document_upload_path, max_length=500)
    file_name = models.CharField(max_length=300)
    original_filename = models.CharField(max_length=300, blank=True)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    mime_type = models.CharField(max_length=100)
    file_hash = models.CharField(max_length=64, blank=True, help_text="SHA-256 hash")
    is_primary = models.BooleanField(default=False, help_text="Primary certificate document")
    category = models.ForeignKey(
        'DocumentCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents',
        help_text="Configurable document category"
    )
    description = models.TextField(blank=True)
    version = models.PositiveIntegerField(default=1, help_text="Document revision number")
    replaced_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='previous_versions',
        help_text="Pointer to new version if replaced"
    )
    is_current = models.BooleanField(default=True, db_index=True)
    status = models.CharField(
        max_length=20,
        default='ACTIVE',
        choices=[('ACTIVE', 'Active'), ('DELETED', 'Deleted'), ('ARCHIVED', 'Archived')]
    )

    # AI/OCR extraction placeholders
    ai_extracted = models.BooleanField(default=False)
    ai_extraction_data = models.JSONField(null=True, blank=True)
    ocr_confidence = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'activities_document'
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'

    def __str__(self):
        return f"{self.file_name} ({self.document_type})"
