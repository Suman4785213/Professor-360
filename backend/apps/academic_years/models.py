"""
Academic Years — AcademicYear Model
"""
import uuid
from django.db import models


class AcademicYear(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='academic_years',
    )
    name = models.CharField(max_length=20, help_text="e.g. '2024-25'")
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    is_current = models.BooleanField(
        default=False,
        help_text="Mark only one academic year as current per college",
    )
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academic_years_academicyear'
        verbose_name = 'Academic Year'
        verbose_name_plural = 'Academic Years'
        unique_together = [('college', 'name')]
        ordering = ['-name']

    def __str__(self):
        return f"{self.name} — {self.college.code}"

    def save(self, *args, **kwargs):
        # Ensure only one current academic year per college
        if self.is_current:
            AcademicYear.objects.filter(
                college=self.college,
                is_current=True,
            ).exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)
