"""
Core Mixins
Reusable mixins for DRF views providing tenant isolation and audit logging.
"""
from apps.audit.utils import log_action


class TenantMixin:
    """
    Mixin that automatically scopes querysets and new object creation
    to the currently authenticated user's college (tenant).
    Also enforces read-only access when a college subscription is suspended.
    """

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        user = request.user
        if user and user.is_authenticated and user.role != 'SUPER_ADMIN' and user.college:
            if getattr(user.college, 'is_suspended', False) or getattr(user.college, 'status', None) == 'SUSPENDED':
                if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied(
                        "College subscription is currently suspended. "
                        "Operational modifications are paused while historical data and reports remain securely accessible."
                    )

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        if user.role == 'SUPER_ADMIN':
            return qs
        if hasattr(qs.model, 'college_id'):
            return qs.filter(college=user.college)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != 'SUPER_ADMIN' and hasattr(serializer.Meta.model, 'college_id'):
            serializer.save(college=user.college)
        else:
            serializer.save()


class DepartmentScopeMixin(TenantMixin):
    """
    Extends TenantMixin to also scope by the user's department.
    Used by HOD, Department In-charge, and Faculty views.
    """

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role in ('HOD', 'DEPARTMENT_INCHARGE') and user.department:
            if hasattr(qs.model, 'department_id'):
                return qs.filter(department=user.department)
        if user.role == 'FACULTY':
            if hasattr(qs.model, 'faculty_id'):
                return qs.filter(faculty=user)
        return qs


class AuditMixin:
    """
    Mixin that logs create/update/delete actions to the audit log.
    """

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(
            actor=self.request.user,
            action='CREATE',
            instance=instance,
            request=self.request,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(
            actor=self.request.user,
            action='UPDATE',
            instance=instance,
            request=self.request,
        )

    def perform_destroy(self, instance):
        log_action(
            actor=self.request.user,
            action='DELETE',
            instance=instance,
            request=self.request,
        )
        instance.delete()
