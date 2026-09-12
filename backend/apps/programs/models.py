import uuid
from django.db import models


class ProgramStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'


class Program(models.Model):
    """
    Academic program/degree offered by a department within a college.
    e.g. B.Tech Information Technology, M.Tech Computer Engineering
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='programs',
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.CASCADE,
        related_name='programs',
    )
    name = models.CharField(max_length=200, help_text="e.g. B.Tech Information Technology")
    code = models.CharField(max_length=50, help_text="e.g. BTECH-IT")
    degree = models.CharField(max_length=100, help_text="e.g. B.Tech, B.E., M.Tech, Ph.D")
    duration_years = models.PositiveIntegerField(default=4)
    status = models.CharField(
        max_length=20,
        choices=ProgramStatus.choices,
        default=ProgramStatus.ACTIVE,
    )
    description = models.TextField(blank=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'programs_program'
        verbose_name = 'Program'
        verbose_name_plural = 'Programs'
        unique_together = [('college', 'code')]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code}) — {self.college.code}"
