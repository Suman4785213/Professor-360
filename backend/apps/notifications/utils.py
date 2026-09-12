"""
Notification Bridge Utility for IQAC Verification Lifecycle.
Re-routes legacy helper calls through Phase 10 NotificationDispatcher.
"""
from apps.notifications.services import NotificationDispatcher
from apps.notifications.models import (
    Notification,
    NotificationCategory,
    NotificationPriority,
)


def notify_user(recipient, sender, notification_type, title, body, related_model=None, related_id=None, college=None, category=None, priority=None, action_url='', action_label=''):
    """Create a notification for a specific user using Phase 10 Dispatcher."""
    if not recipient:
        return None

    cat = category or NotificationCategory.SYSTEM
    pri = priority or NotificationPriority.NORMAL

    return NotificationDispatcher.dispatch(
        recipient=recipient,
        sender=sender,
        category=cat,
        notification_type=notification_type,
        title=title,
        body=body,
        priority=pri,
        action_url=action_url,
        action_label=action_label,
        related_model=related_model or '',
        related_id=related_id,
        college=college or getattr(recipient, 'college', None),
        deduplication_key=f"legacy_{recipient.id}_{notification_type}_{related_id or ''}"
    )


def notify_on_submission(activity, sender):
    """Faculty submits -> Notify Department In-charge."""
    NotificationDispatcher.notify_on_submission(activity, sender)


def notify_on_incharge_approval(activity, sender):
    """In-charge approves -> Notify HOD."""
    NotificationDispatcher.notify_on_incharge_approval(activity, sender)


def notify_on_incharge_rejection(activity, sender, reason):
    """In-charge rejects -> Notify Faculty to correct."""
    NotificationDispatcher.notify_on_incharge_rejection(activity, sender, reason)


def notify_on_hod_approval(activity, sender):
    """HOD approves -> Notify IQAC Coordinators."""
    NotificationDispatcher.notify_on_hod_approval(activity, sender)


def notify_on_hod_rejection(activity, sender, reason):
    """HOD rejects -> Notify Department In-charge."""
    NotificationDispatcher.notify_on_hod_rejection(activity, sender, reason)


def notify_on_iqac_approval(activity, sender):
    """IQAC approves -> Notify Faculty owner, In-charge, and HOD."""
    NotificationDispatcher.notify_on_iqac_approval(activity, sender)


def notify_on_iqac_rejection(activity, sender, reason, target_role='DEPARTMENT_INCHARGE'):
    """IQAC rejects -> Notify target role / Faculty."""
    NotificationDispatcher.notify_on_iqac_rejection(activity, sender, reason, target_role)
