"""Audit app models — immutable audit log."""
import uuid
from django.db import models


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey('colleges.College', on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    actor = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    actor_role = models.CharField(max_length=30, blank=True)
    actor_email = models.EmailField(blank=True)  # preserve even if user deleted
    action = models.CharField(max_length=100)
    model_name = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    object_repr = models.CharField(max_length=300, blank=True)
    comment = models.TextField(blank=True)
    previous_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_auditlog'
        verbose_name = 'Audit Log'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} by {self.actor_email} at {self.created_at}"
