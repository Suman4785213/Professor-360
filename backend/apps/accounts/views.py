"""
Accounts — Views
Auth endpoints, User management, and Faculty Profile workflows.
"""
import uuid
from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from core.permissions import IsSuperAdmin, IsSuperAdminOrIQAC, IsFaculty
from core.mixins import TenantMixin
from apps.audit.utils import log_action
from .models import User, UserRole, FacultyProfile, PasswordResetToken
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    MeSerializer, ChangePasswordSerializer, FacultyProfileSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer,
)


class LoginView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/
    Returns access + refresh tokens with user data.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            email = request.data.get('email', '')
            try:
                user = User.objects.select_related('college', 'department').get(email=email)
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])
                response.data['user'] = MeSerializer(user, context={'request': request}).data
                response.data['success'] = True

                # Requirement #19: Log login action in audit log
                log_action(
                    actor=user,
                    action='LOGIN',
                    instance=user,
                    request=request,
                    comment=f'User {user.email} logged in successfully.'
                )
            except User.DoesNotExist:
                pass
        return response


class LogoutView(generics.GenericAPIView):
    """POST /api/v1/auth/logout/ — blacklist refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            # Requirement #19: Log logout action in audit log
            log_action(
                actor=user,
                action='LOGOUT',
                instance=user,
                request=request,
                comment=f'User {user.email} logged out.'
            )
            return Response({'success': True, 'message': 'Logged out successfully.'})
        except Exception:
            return Response({'success': True, 'message': 'Session cleared.'})


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/me/ — current user profile."""
    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return MeSerializer

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        response = super().update(request, *args, **kwargs)
        log_action(
            actor=request.user,
            action='USER_UPDATE_SELF',
            instance=request.user,
            request=request,
            comment=f'User {request.user.email} updated own profile details.'
        )
        return response


class ChangePasswordView(generics.GenericAPIView):
    """POST /api/v1/auth/change-password/"""
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'success': False, 'error': 'Old password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        log_action(
            actor=user,
            action='CHANGE_PASSWORD',
            instance=user,
            request=request,
            comment=f'User {user.email} changed password.'
        )
        return Response({'success': True, 'message': 'Password changed successfully.'})


class ForgotPasswordView(generics.GenericAPIView):
    """
    POST /api/v1/auth/forgot-password/
    Generates a secure password reset token.
    """
    permission_classes = [AllowAny]
    serializer_class = ForgotPasswordSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email, is_active=True)
            # Create a 24-hour reset token
            token_str = uuid.uuid4().hex
            expires_at = timezone.now() + timedelta(hours=24)
            PasswordResetToken.objects.create(
                user=user,
                token=token_str,
                expires_at=expires_at
            )
            # Log foundation event
            log_action(
                actor=user,
                action='PASSWORD_RESET_REQUESTED',
                instance=user,
                request=request,
                comment=f'Password reset token generated for {user.email}.'
            )
            return Response({
                'success': True,
                'message': 'If the email exists, a password reset link has been dispatched.',
                'reset_token': token_str  # returned for testing/development foundation
            })
        except User.DoesNotExist:
            return Response({
                'success': True,
                'message': 'If the email exists, a password reset link has been dispatched.'
            })


class ResetPasswordView(generics.GenericAPIView):
    """
    POST /api/v1/auth/reset-password/
    Validates token and updates user password.
    """
    permission_classes = [AllowAny]
    serializer_class = ResetPasswordSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_str = serializer.validated_data['token']
        try:
            reset_token = PasswordResetToken.objects.get(token=token_str)
            if not reset_token.is_valid():
                return Response(
                    {'success': False, 'error': 'Password reset token has expired or already been used.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = reset_token.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()

            reset_token.is_used = True
            reset_token.save()

            log_action(
                actor=user,
                action='PASSWORD_RESET_COMPLETED',
                instance=user,
                request=request,
                comment=f'Password successfully reset for {user.email}.'
            )
            return Response({'success': True, 'message': 'Password has been successfully updated. You can now login.'})
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Invalid reset token.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class FacultyProfileView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/v1/auth/faculty/profile/ or /api/v1/faculty/profile/
    Allows faculty to access and update their own profile permitted fields.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = FacultyProfileSerializer

    def get_object(self):
        user = self.request.user
        # Return existing profile or auto-create if faculty
        profile, created = FacultyProfile.objects.get_or_create(
            user=user,
            defaults={
                'college': user.college,
                'department': user.department,
                'employee_id': user.employee_id,
                'designation': user.designation,
                'phone': user.phone,
            }
        )
        return profile

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        response = super().update(request, *args, **kwargs)
        log_action(
            actor=request.user,
            action='FACULTY_PROFILE_UPDATE',
            instance=self.get_object(),
            request=request,
            comment=f'Faculty {request.user.email} updated their profile.'
        )
        return response


class FacultyProfileViewSet(TenantMixin, viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/faculty/profiles/
    For HOD, In-charge, IQAC, Super Admin to view faculty profiles within their scope.
    """
    queryset = FacultyProfile.objects.all().select_related('user', 'department', 'college')
    serializer_class = FacultyProfileSerializer
    filterset_fields = ['department', 'status']
    search_fields = ['user__first_name', 'user__last_name', 'employee_id', 'designation']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return FacultyProfile.objects.none()
        if user.role in ['HOD', 'DEPARTMENT_INCHARGE'] and user.department:
            return qs.filter(department=user.department)
        elif user.role == 'FACULTY':
            return qs.filter(user=user)
        return qs


class UserViewSet(TenantMixin, viewsets.ModelViewSet):
    """
    GET    /api/v1/auth/users/ or /api/v1/users/
    POST   /api/v1/auth/users/
    GET    /api/v1/auth/users/:id/
    PUT    /api/v1/auth/users/:id/
    PATCH  /api/v1/auth/users/:id/activate/
    PATCH  /api/v1/auth/users/:id/deactivate/
    """
    queryset = User.objects.select_related('college', 'department').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'department', 'college', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'employee_id']
    ordering_fields = ['first_name', 'last_name', 'created_at', 'role']
    ordering = ['first_name']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        if self.action in ('create', 'destroy'):
            return [IsSuperAdminOrIQAC()]
        return [IsSuperAdminOrIQAC()]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return User.objects.none()
        # Tenant isolation
        if user.role != 'SUPER_ADMIN':
            qs = qs.filter(college=user.college)
        # Department isolation for HOD and In-charge
        if user.role in ('HOD', 'DEPARTMENT_INCHARGE') and user.department:
            return qs.filter(department=user.department)
        # Faculty isolation (can only see self)
        if user.role == 'FACULTY':
            return qs.filter(id=user.id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        created_user = serializer.save()

        # Audit log for user creation & role assignment
        log_action(
            actor=user,
            action='USER_CREATED',
            instance=created_user,
            request=self.request,
            comment=f'Created user {created_user.email} with role {created_user.role}.'
        )

    def perform_update(self, serializer):
        prev_role = serializer.instance.role
        updated_user = serializer.save()

        action = 'ROLE_ASSIGNED' if prev_role != updated_user.role else 'USER_UPDATED'
        log_action(
            actor=self.request.user,
            action=action,
            instance=updated_user,
            request=self.request,
            comment=f'Updated user {updated_user.email}. Role: {updated_user.role}.'
        )

    @action(detail=True, methods=['patch'], url_path='activate')
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active'])

        log_action(
            actor=request.user,
            action='USER_ACTIVATED',
            instance=user,
            request=request,
            comment=f'Activated user account {user.email}.'
        )
        return Response({'success': True, 'message': f'{user.get_full_name()} activated.'})

    @action(detail=True, methods=['patch'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        user = self.get_object()
        if user == request.user:
            return Response({'error': 'Cannot deactivate yourself.'}, status=400)
        user.is_active = False
        user.save(update_fields=['is_active'])

        log_action(
            actor=request.user,
            action='USER_DEACTIVATED',
            instance=user,
            request=request,
            comment=f'Deactivated user account {user.email}.'
        )
        return Response({'success': True, 'message': f'{user.get_full_name()} deactivated.'})
