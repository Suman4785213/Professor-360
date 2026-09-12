"""Evidence app models — Phase 4 Digital Evidence Repository."""
import uuid
from django.db import models


class Evidence(models.Model):
    """
    Sealed institutional evidence record generated upon IQAC verification approval.
    Serves as the single source of truth for AQAR, SSR, and accreditation queries.
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('ARCHIVED', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey('colleges.College', on_delete=models.CASCADE, related_name='evidence')
    department = models.ForeignKey('departments.Department', on_delete=models.CASCADE, related_name='evidence')
    faculty = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='evidence')
    activity = models.OneToOneField('activities.Activity', on_delete=models.CASCADE, related_name='evidence')
    academic_year = models.ForeignKey('academic_years.AcademicYear', on_delete=models.SET_NULL, null=True, related_name='evidence')
    document = models.ForeignKey('activities.Document', on_delete=models.SET_NULL, null=True, blank=True, related_name='evidence')
    
    title = models.CharField(max_length=300, db_index=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True, db_index=True)
    tags = models.JSONField(default=list, blank=True)
    
    is_verified = models.BooleanField(default=True, db_index=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Archive controls (Section 34)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE', db_index=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='archived_evidence'
    )
    archive_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'evidence_evidence'
        verbose_name = 'Evidence'
        verbose_name_plural = 'Evidence Records'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['college', 'status']),
            models.Index(fields=['department', 'status']),
            models.Index(fields=['faculty', 'status']),
            models.Index(fields=['academic_year', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.title} [{self.category}] — {self.faculty.get_full_name()}"
