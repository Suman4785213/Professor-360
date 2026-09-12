"""
Core Base Models
Provides TimestampedModel and TenantModel as base classes for all app models.
"""
import uuid
from django.db import models


class TimestampedModel(models.Model):
    """
    Abstract base class that provides self-updating
    created_at and updated_at fields.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantModel(TimestampedModel):
    """
    Abstract base class for all models that belong to a college (tenant).
    Provides automatic tenant isolation through the college FK.
    """
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='+',  # no reverse accessor — set explicitly in subclasses
    )

    class Meta:
        abstract = True


class UUIDModel(models.Model):
    """
    Abstract base class that uses UUID as the primary key.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimestampedUUIDModel(UUIDModel, TimestampedModel):
    """UUID + timestamps — most models inherit this."""
    class Meta:
        abstract = True


class TenantUUIDModel(UUIDModel, TenantModel):
    """UUID + college FK + timestamps — for tenant-scoped models."""
    class Meta:
        abstract = True
