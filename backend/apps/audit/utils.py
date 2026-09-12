"""
Audit logging utility functions.
"""
from apps.audit.models import AuditLog


def get_client_ip(request):
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_action(actor, action, instance=None, request=None, previous_data=None, new_data=None, comment='', college=None):
    """
    Log an administrative or workflow action into AuditLog.
    """
    if not college:
        college = getattr(instance, 'college', None) if instance else None
    if not college and actor and hasattr(actor, 'college'):
        college = actor.college

    model_name = instance.__class__.__name__ if instance else ''
    object_id = str(getattr(instance, 'pk', '')) if instance else ''
    object_repr = str(instance)[:300] if instance else ''

    ip_address = get_client_ip(request) if request else None
    user_agent = request.META.get('HTTP_USER_AGENT', '') if request else ''

    actor_role = getattr(actor, 'role', '') if actor else 'SYSTEM'
    actor_email = getattr(actor, 'email', '') if actor else 'system@iqac.local'

    return AuditLog.objects.create(
        college=college,
        actor=actor if actor and actor.is_authenticated else None,
        actor_role=actor_role,
        actor_email=actor_email,
        action=action,
        model_name=model_name,
        object_id=object_id,
        object_repr=object_repr,
        comment=comment,
        previous_data=previous_data,
        new_data=new_data,
        ip_address=ip_address,
        user_agent=user_agent,
    )
