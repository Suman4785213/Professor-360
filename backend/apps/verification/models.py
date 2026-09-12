"""
Verification — VerificationRecord and VerificationLog Models
Complete audit trail of the verification state machine.
"""
import uuid
from django.db import models


class VerificationAction(models.TextChoices):
    SUBMITTED = 'SUBMITTED', 'Submitted'
    INCHARGE_APPROVED = 'INCHARGE_APPROVED', 'Approved by In-charge'
    INCHARGE_REJECTED = 'INCHARGE_REJECTED', 'Rejected by In-charge'
    HOD_APPROVED = 'HOD_APPROVED', 'Approved by HOD'
    HOD_REJECTED = 'HOD_REJECTED', 'Rejected by HOD'
    IQAC_APPROVED = 'IQAC_APPROVED', 'Approved by IQAC'
    IQAC_REJECTED = 'IQAC_REJECTED', 'Rejected by IQAC'
    RESUBMITTED = 'RESUBMITTED', 'Resubmitted'
    MARKED_EVIDENCE = 'MARKED_EVIDENCE', 'Marked as Verified Evidence'


class VerificationRecord(models.Model):
    """
    Tracks the current verification state of an activity.
    One record per activity, updated in place as it moves through the workflow.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    activity = models.OneToOneField(
        'activities.Activity',
        on_delete=models.CASCADE,
        related_name='verification_record',
    )
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='verification_records',
    )

    current_status = models.CharField(max_length=30, db_index=True)

    # In-charge verification
    incharge_verified_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incharge_verifications',
    )
    incharge_verified_at = models.DateTimeField(null=True, blank=True)
    incharge_comment = models.TextField(blank=True)

    # HOD approval
    hod_approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hod_approvals',
    )
    hod_approved_at = models.DateTimeField(null=True, blank=True)
    hod_comment = models.TextField(blank=True)

    # IQAC verification
    iqac_verified_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='iqac_verifications',
    )
    iqac_verified_at = models.DateTimeField(null=True, blank=True)
    iqac_comment = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'verification_verificationrecord'
        verbose_name = 'Verification Record'

    def __str__(self):
        return f"Verification: {self.activity.title} [{self.current_status}]"


class VerificationLog(models.Model):
    """
    Immutable log of every action taken during verification.
    Never deleted — forms the complete audit trail.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    verification_record = models.ForeignKey(
        VerificationRecord,
        on_delete=models.CASCADE,
        related_name='logs',
    )
    actor = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='verification_actions',
    )
    role = models.CharField(max_length=30)
    action = models.CharField(max_length=30, choices=VerificationAction.choices)
    previous_status = models.CharField(max_length=30)
    new_status = models.CharField(max_length=30)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'verification_verificationlog'
        verbose_name = 'Verification Log'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.action} by {self.actor} at {self.created_at}"
