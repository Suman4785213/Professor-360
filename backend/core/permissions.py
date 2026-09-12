"""
Core Permissions
Custom DRF permission classes for role-based access control.
"""
from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    """Only Super Admin can access."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'SUPER_ADMIN'
        )


class IsCollegeManagement(BasePermission):
    """College Management role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'COLLEGE_MANAGEMENT'
        )


class IsIQAC(BasePermission):
    """IQAC role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'IQAC'
        )


class IsHOD(BasePermission):
    """HOD role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'HOD'
        )


class IsDepartmentIncharge(BasePermission):
    """Department In-charge role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'DEPARTMENT_INCHARGE'
        )


class IsFaculty(BasePermission):
    """Faculty role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'FACULTY'
        )


class IsSuperAdminOrIQAC(BasePermission):
    """Super Admin or IQAC."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ('SUPER_ADMIN', 'IQAC')
        )


class IsCollegeStaff(BasePermission):
    """Any authenticated user belonging to a college (non-super-admin)."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.college is not None
        )


class IsSuperAdminOrCollegeStaff(BasePermission):
    """Super Admin or any college staff member."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == 'SUPER_ADMIN' or request.user.college is not None


class CanVerifyAsIncharge(BasePermission):
    """User must be DEPARTMENT_INCHARGE and belong to the activity's department."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'DEPARTMENT_INCHARGE'
        )

    def has_object_permission(self, request, view, obj):
        # obj is an Activity
        return obj.department == request.user.department


class CanVerifyAsHOD(BasePermission):
    """User must be HOD and belong to the activity's department."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'HOD'
        )

    def has_object_permission(self, request, view, obj):
        return obj.department == request.user.department


class IsAuthorizedBillingUser(BasePermission):
    """Allows Super Admin, College Management, and IQAC coordinators access to billing and commercial controls."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ('SUPER_ADMIN', 'COLLEGE_MANAGEMENT', 'IQAC')
        )
