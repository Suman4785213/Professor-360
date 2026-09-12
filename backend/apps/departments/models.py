"""
Departments — Department Model
"""
import uuid
from django.db import models


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='departments',
    )
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)

    # HOD and In-charge can be assigned here OR managed via User.department
    hod = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hod_department',
    )
    incharge = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incharge_department',
    )

    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'departments_department'
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'
        unique_together = [('college', 'code')]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} — {self.college.code}"
