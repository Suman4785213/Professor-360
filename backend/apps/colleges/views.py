"""
Colleges App Views — Phase 11: Multi-College SaaS & Super Admin Control Center
ViewSets for Colleges, Settings, Plans, Subscriptions, Feature Flags, Invitations, and System Health.
"""
import secrets
from django.utils import timezone
from django.db import transaction
from django.http import JsonResponse
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from core.permissions import IsSuperAdmin, IsSuperAdminOrIQAC
from apps.audit.utils import log_action
from apps.accounts.models import User, UserRole, FacultyProfile
from .models import (
    College, Plan, Subscription, TenantFeatureFlag,
    TenantUsage, UserInvitation, CollegeStatus, SubscriptionStatus, BillingCycle
)
from .serializers import (
    CollegeSerializer, CollegeSettingsSerializer, CollegeCreateWithAdminSerializer,
    PlanSerializer, SubscriptionSerializer, TenantFeatureFlagSerializer,
    TenantUsageSerializer, UserInvitationSerializer, UserInvitationAcceptSerializer,
    CollegeHealthSummarySerializer
)
from .services import FeatureAccessService, UsageLimitService, TenantExportService, SystemHealthService
from .billing import BillingService


class CollegeViewSet(viewsets.ModelViewSet):
    """
    Main College Tenant Management ViewSet.
    Super Admin has platform-level oversight; institutional coordinators can view and update their own college settings.
    """
    queryset = College.objects.filter(is_deleted=False).select_related('usage')
    serializer_class = CollegeSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'suspend', 'activate', 'archive', 'restore', 'health_summary']:
            return [IsSuperAdmin()]
        if self.action in ['list']:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return College.objects.none()
        if user.role == 'SUPER_ADMIN':
            return College.objects.filter(is_deleted=False)
        if user.college:
            return College.objects.filter(id=user.college.id, is_deleted=False)
        return College.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return CollegeCreateWithAdminSerializer
        return CollegeSerializer

    def perform_create(self, serializer):
        user = self.request.user
        validated_data = dict(serializer.validated_data)

        # Extract admin user fields
        admin_email = validated_data.pop('admin_email')
        admin_first_name = validated_data.pop('admin_first_name', 'College')
        admin_last_name = validated_data.pop('admin_last_name', 'Coordinator')
        admin_password = validated_data.pop('admin_password', 'CollegeAdmin@123')
        admin_role = validated_data.pop('admin_role', UserRole.IQAC)
        plan_code = validated_data.pop('plan_code', 'starter')

        with transaction.atomic():
            college = serializer.save(status=CollegeStatus.SETUP, setup_step=1, setup_completed=False)

            # Provision initial admin user
            admin_user = User.objects.create_user(
                email=admin_email,
                password=admin_password,
                first_name=admin_first_name,
                last_name=admin_last_name,
                role=admin_role,
                college=college,
                is_active=True,
                is_email_verified=True,
            )

            # Assign initial SaaS subscription
            plan = Plan.objects.filter(code=plan_code).first()
            if not plan:
                plan = Plan.objects.filter(is_active=True).first()
            if plan:
                billing_service = BillingService()
                billing_service.subscribe_college(
                    college=college,
                    plan=plan,
                    billing_cycle=BillingCycle.YEARLY,
                    actor=user,
                    is_trial=True,
                )

            # Initialize usage record
            TenantUsage.objects.get_or_create(college=college)

            log_action(
                actor=user,
                action='COLLEGE_CREATED',
                instance=college,
                college=college,
                request=self.request,
                comment=f"Created college {college.name} ({college.code}) with initial admin {admin_email} on {plan.name if plan else 'default'} plan."
            )

    def perform_destroy(self, instance):
        # Soft delete instead of cascading destruction
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

        log_action(
            actor=self.request.user,
            action='COLLEGE_ARCHIVED',
            instance=instance,
            college=instance,
            request=self.request,
            comment=f"Archived college tenant {instance.name} ({instance.code})."
        )

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        user = request.user
        if not user.college:
            return Response({'detail': 'No college tenant assigned to current user.'}, status=404)
        serializer = self.get_serializer(user.college)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'patch'], url_path='current/settings')
    def current_settings(self, request):
        """
        GET / PATCH /api/colleges/current/settings/
        Allows IQAC and College Management to view and configure their college settings.
        """
        user = request.user
        if not user.college:
            return Response({'detail': 'No college tenant assigned.'}, status=404)

        college = user.college
        if request.method == 'GET':
            serializer = CollegeSettingsSerializer(college)
            return Response(serializer.data)

        if user.role not in [UserRole.SUPER_ADMIN, UserRole.IQAC, UserRole.COLLEGE_MANAGEMENT]:
            return Response({'error': '403 Forbidden — Only administrators can update college settings.'}, status=403)

        serializer = CollegeSettingsSerializer(college, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_college = serializer.save()

        log_action(
            actor=user,
            action='COLLEGE_SETTINGS_UPDATED',
            instance=updated_college,
            college=updated_college,
            request=request,
            comment=f"Updated settings for {updated_college.name}."
        )
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='suspend')
    def suspend(self, request, pk=None):
        college = self.get_object()
        reason = request.data.get('reason', 'Administrative suspension by Super Admin.')

        college.status = CollegeStatus.SUSPENDED
        college.is_active = False
        college.save(update_fields=['status', 'is_active', 'updated_at'])

        log_action(
            actor=request.user,
            action='COLLEGE_SUSPENDED',
            instance=college,
            college=college,
            request=request,
            comment=f"Suspended college {college.name}. Reason: {reason}"
        )
        return Response({'success': True, 'status': college.status, 'message': f"{college.name} has been suspended."})

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        college = self.get_object()
        college.status = CollegeStatus.ACTIVE
        college.is_active = True
        college.save(update_fields=['status', 'is_active', 'updated_at'])

        log_action(
            actor=request.user,
            action='COLLEGE_ACTIVATED',
            instance=college,
            college=college,
            request=request,
            comment=f"Activated college {college.name}."
        )
        return Response({'success': True, 'status': college.status, 'message': f"{college.name} is now active."})

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        college = self.get_object()
        reason = request.data.get('reason', 'Administrative archival by Super Admin.')
        college.status = CollegeStatus.ARCHIVED
        college.is_active = False
        college.save(update_fields=['status', 'is_active', 'updated_at'])

        log_action(
            actor=request.user,
            action='COLLEGE_ARCHIVED',
            instance=college,
            college=college,
            request=request,
            comment=f"Archived college {college.name}. Reason: {reason}"
        )
        return Response({'success': True, 'status': college.status, 'message': f"{college.name} has been archived."})

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        college = self.get_object()
        reason = request.data.get('reason', 'Restored by Super Admin.')
        college.status = CollegeStatus.ACTIVE
        college.is_active = True
        college.is_deleted = False
        college.save(update_fields=['status', 'is_active', 'is_deleted', 'updated_at'])

        log_action(
            actor=request.user,
            action='COLLEGE_RESTORED',
            instance=college,
            college=college,
            request=request,
            comment=f"Restored college {college.name}. Reason: {reason}"
        )
        return Response({'success': True, 'status': college.status, 'message': f"{college.name} has been restored to active status."})

    @action(detail=True, methods=['post'], url_path='setup-step')
    def setup_step(self, request, pk=None):
        """
        Advances or updates progress in the 9-step college onboarding wizard.
        """
        college = self.get_object()
        step = request.data.get('step', college.setup_step)
        step_data = request.data.get('data', {})

        if isinstance(step, int) and 1 <= step <= 9:
            college.setup_step = step
            if step == 9:
                college.setup_completed = True
                college.status = CollegeStatus.ACTIVE
                college.is_active = True
            college.save(update_fields=['setup_step', 'setup_completed', 'status', 'is_active', 'updated_at'])

        return Response({
            'success': True,
            'college_id': str(college.id),
            'setup_step': college.setup_step,
            'setup_completed': college.setup_completed,
            'status': college.status
        })

    @action(detail=True, methods=['post'], url_path='complete-setup')
    def complete_setup(self, request, pk=None):
        college = self.get_object()
        college.setup_step = 9
        college.setup_completed = True
        college.status = CollegeStatus.ACTIVE
        college.is_active = True
        college.save(update_fields=['setup_step', 'setup_completed', 'status', 'is_active', 'updated_at'])

        log_action(
            actor=request.user,
            action='SETUP_COMPLETED',
            instance=college,
            college=college,
            request=request,
            comment=f"Completed setup wizard for {college.name}."
        )
        return Response({'success': True, 'message': f"Onboarding complete for {college.name}."})

    @action(detail=True, methods=['get'], url_path='export')
    def export_data(self, request, pk=None):
        """
        Generates a complete structured JSON export of the college tenant's data.
        """
        college = self.get_object()
        user = request.user

        if user.role != UserRole.SUPER_ADMIN and user.college != college:
            return Response({'error': '403 Forbidden — Cannot export another institution.'}, status=403)

        export_data = TenantExportService.export_tenant_data(college)
        log_action(
            actor=user,
            action='TENANT_EXPORTED',
            instance=college,
            college=college,
            request=request,
            comment=f"Exported complete data bundle for {college.name}."
        )
        return JsonResponse(export_data, safe=False)

    @action(detail=True, methods=['get'], url_path='usage')
    def usage(self, request, pk=None):
        college = self.get_object()
        user = request.user
        if user.role != UserRole.SUPER_ADMIN and user.college != college:
            return Response({'error': '403 Forbidden'}, status=403)

        summary = UsageLimitService.get_usage_summary(college)
        return Response(summary)

    @action(detail=False, methods=['get'], url_path='current/usage')
    def current_usage(self, request):
        user = request.user
        if not user.college:
            return Response({'detail': 'No college assigned'}, status=404)
        summary = UsageLimitService.get_usage_summary(user.college)
        return Response(summary)

    @action(detail=False, methods=['get'], url_path='health-summary')
    def health_summary(self, request):
        """
        Returns high-level health & quota directory for all colleges for Super Admin.
        """
        colleges = College.objects.filter(is_deleted=False).select_related('usage').prefetch_related('subscriptions')
        serializer = CollegeHealthSummarySerializer(colleges, many=True)
        return Response(serializer.data)


class PlanViewSet(viewsets.ModelViewSet):
    """
    SaaS Plans Management ViewSet.
    Listing is open to authenticated users; modifications are restricted to Super Admin.
    """
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsSuperAdmin()]

    def perform_create(self, serializer):
        plan = serializer.save()
        log_action(
            actor=self.request.user,
            action='PLAN_CREATED',
            instance=plan,
            request=self.request,
            comment=f"Created SaaS plan {plan.name} (${plan.price_monthly}/mo)."
        )

    def perform_update(self, serializer):
        plan = serializer.save()
        log_action(
            actor=self.request.user,
            action='PLAN_UPDATED',
            instance=plan,
            request=self.request,
            comment=f"Updated SaaS plan {plan.name}."
        )


class SubscriptionViewSet(viewsets.ModelViewSet):
    """
    SaaS Subscriptions ViewSet.
    """
    queryset = Subscription.objects.select_related('college', 'plan').all()
    serializer_class = SubscriptionSerializer

    def get_permissions(self):
        if self.action in ['dashboard', 'list']:
            return [IsSuperAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.SUPER_ADMIN:
            return Subscription.objects.select_related('college', 'plan').all()
        if user.college:
            return Subscription.objects.filter(college=user.college).select_related('college', 'plan')
        return Subscription.objects.none()

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        user = request.user
        if not user.college:
            return Response({'detail': 'No college assigned.'}, status=404)
        sub = user.college.active_subscription
        if not sub:
            return Response({'detail': 'No active subscription found.'}, status=404)
        serializer = self.get_serializer(sub)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='change-plan')
    def change_plan(self, request):
        user = request.user
        college_id = request.data.get('college_id')
        plan_id = request.data.get('plan_id')

        if not plan_id:
            return Response({'error': 'plan_id is required.'}, status=400)

        college = None
        if user.role == UserRole.SUPER_ADMIN and college_id:
            college = College.objects.filter(id=college_id).first()
        elif user.college:
            college = user.college

        if not college:
            return Response({'error': 'Target college not found.'}, status=404)

        plan = Plan.objects.filter(id=plan_id).first()
        if not plan:
            return Response({'error': 'Target plan not found.'}, status=404)

        billing_service = BillingService()
        updated_sub = billing_service.change_plan(college, plan, actor=user)
        serializer = self.get_serializer(updated_sub)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='cancel')
    def cancel(self, request):
        user = request.user
        college = user.college
        college_id = request.data.get('college_id')
        if user.role == UserRole.SUPER_ADMIN and college_id:
            college = College.objects.filter(id=college_id).first()

        if not college or not college.active_subscription:
            return Response({'error': 'No active subscription found to cancel.'}, status=404)

        billing_service = BillingService()
        cancelled_sub = billing_service.cancel_subscription(college.active_subscription, actor=user)
        serializer = self.get_serializer(cancelled_sub)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        """
        Super Admin Subscriptions Overview: MRR, ARR, trial accounts, plan distribution.
        """
        subscriptions = Subscription.objects.select_related('college', 'plan').filter(status__in=['ACTIVE', 'TRIAL'])
        total_mrr = sum([float(s.plan.price_monthly) for s in subscriptions if s.plan])
        total_arr = sum([float(s.plan.price_yearly or s.plan.price_monthly * 12) for s in subscriptions if s.plan])

        plan_dist = {}
        for s in subscriptions:
            plan_name = s.plan.name if s.plan else 'Unknown'
            plan_dist[plan_name] = plan_dist.get(plan_name, 0) + 1

        all_subs = Subscription.objects.all()
        status_dist = {}
        for s in all_subs:
            status_dist[s.status] = status_dist.get(s.status, 0) + 1

        return Response({
            'total_colleges': College.objects.filter(is_deleted=False).count(),
            'active_subscriptions': subscriptions.count(),
            'trial_colleges': Subscription.objects.filter(status='TRIAL').count(),
            'past_due_colleges': Subscription.objects.filter(status='PAST_DUE').count(),
            'suspended_colleges': College.objects.filter(status='SUSPENDED', is_deleted=False).count(),
            'mrr': round(total_mrr, 2),
            'arr': round(total_arr, 2),
            'plan_distribution': plan_dist,
            'status_distribution': status_dist,
        })


class FeatureFlagViewSet(viewsets.ModelViewSet):
    """
    Feature Flags ViewSet for Super Admin.
    """
    queryset = TenantFeatureFlag.objects.select_related('college').all()
    serializer_class = TenantFeatureFlagSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'resolved']:
            return [IsAuthenticated()]
        return [IsSuperAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.SUPER_ADMIN:
            return TenantFeatureFlag.objects.all()
        if user.college:
            return TenantFeatureFlag.objects.filter(college=user.college)
        return TenantFeatureFlag.objects.none()

    @action(detail=False, methods=['get'], url_path='resolved')
    def resolved(self, request):
        user = request.user
        college = user.college
        college_id = request.query_params.get('college_id')
        if user.role == UserRole.SUPER_ADMIN and college_id:
            college = College.objects.filter(id=college_id).first()

        flags = FeatureAccessService.get_all_features_for_college(college)
        return Response(flags)

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle(self, request):
        college_id = request.data.get('college_id')
        feature_key = request.data.get('feature_key')
        is_enabled = request.data.get('is_enabled', True)
        reason = request.data.get('reason', '')

        if not college_id or not feature_key:
            return Response({'error': 'college_id and feature_key are required.'}, status=400)

        college = College.objects.filter(id=college_id).first()
        if not college:
            return Response({'error': 'College not found.'}, status=404)

        flag, created = TenantFeatureFlag.objects.update_or_create(
            college=college,
            feature_key=feature_key,
            defaults={'is_enabled': is_enabled, 'reason': reason}
        )

        log_action(
            actor=request.user,
            action='FEATURE_TOGGLED',
            instance=flag,
            college=college,
            request=request,
            comment=f"Toggled {feature_key} to {is_enabled} for {college.name}."
        )

        serializer = self.get_serializer(flag)
        return Response(serializer.data)


class UserInvitationViewSet(viewsets.ModelViewSet):
    """
    User Invitation ViewSet.
    College administrators can invite colleagues; public token endpoint permits self-registration.
    """
    queryset = UserInvitation.objects.select_related('college', 'department', 'invited_by').all()
    serializer_class = UserInvitationSerializer

    def get_permissions(self):
        if self.action == 'accept':
            return [AllowAny()]
        return [IsSuperAdminOrIQAC()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return UserInvitation.objects.none()
        if user.role == UserRole.SUPER_ADMIN:
            return UserInvitation.objects.all()
        if user.college:
            return UserInvitation.objects.filter(college=user.college)
        return UserInvitation.objects.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        college = user.college
        college_id = request.data.get('college')

        if user.role == UserRole.SUPER_ADMIN and college_id:
            college = College.objects.filter(id=college_id).first()

        if not college:
            return Response({'error': 'College tenant is required.'}, status=400)

        # Quota check
        usage_summary = UsageLimitService.get_usage_summary(college)
        if usage_summary['users']['is_exceeded']:
            return Response({
                'error': f"User quota limit reached ({usage_summary['users']['used']}/{usage_summary['users']['limit']}). Please upgrade plan to invite more members."
            }, status=400)

        email = request.data.get('email')
        role = request.data.get('role', UserRole.FACULTY)
        department_id = request.data.get('department')

        # Prevent self-privilege escalation
        if user.role != UserRole.SUPER_ADMIN:
            if role in [UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT]:
                return Response({'error': '403 Forbidden — You cannot invite privileged administration accounts.'}, status=403)

        # Check existing user
        if User.objects.filter(email=email).exists():
            return Response({'error': 'A user with this email address is already registered.'}, status=400)

        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timezone.timedelta(days=7)

        department = None
        if department_id:
            from apps.departments.models import Department
            department = Department.objects.filter(id=department_id, college=college).first()

        invitation = UserInvitation.objects.create(
            college=college,
            email=email,
            role=role,
            department=department,
            token=token,
            invited_by=user,
            expires_at=expires_at,
        )

        log_action(
            actor=user,
            action='INVITATION_SENT',
            instance=invitation,
            college=college,
            request=request,
            comment=f"Invited {email} as {role} for {college.name}."
        )

        serializer = self.get_serializer(invitation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        invitation = self.get_object()
        invitation.status = 'CANCELLED'
        invitation.save(update_fields=['status', 'updated_at'])
        return Response({'success': True, 'message': f"Invitation to {invitation.email} cancelled."})

    @action(detail=True, methods=['post'], url_path='resend')
    def resend(self, request, pk=None):
        invitation = self.get_object()
        invitation.expires_at = timezone.now() + timezone.timedelta(days=7)
        invitation.token = secrets.token_urlsafe(32)
        invitation.status = 'PENDING'
        invitation.save(update_fields=['expires_at', 'token', 'status', 'updated_at'])

        log_action(
            actor=request.user,
            action='INVITATION_RESENT',
            instance=invitation,
            college=invitation.college,
            request=request,
            comment=f"Resent invitation to {invitation.email}."
        )
        serializer = self.get_serializer(invitation)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='accept')
    def accept(self, request):
        """
        Public endpoint for users to accept invitation and activate their account.
        """
        serializer = UserInvitationAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['token']
        first_name = serializer.validated_data['first_name']
        last_name = serializer.validated_data['last_name']
        password = serializer.validated_data['password']

        invitation = UserInvitation.objects.filter(token=token, status='PENDING').first()
        if not invitation or invitation.is_expired:
            return Response({'error': 'Invitation token is invalid or has expired.'}, status=400)

        with transaction.atomic():
            new_user = User.objects.create_user(
                email=invitation.email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=invitation.role,
                college=invitation.college,
                department=invitation.department,
                is_active=True,
                is_email_verified=True,
            )

            # Auto-create FacultyProfile if Faculty and department available
            dept = invitation.department or invitation.college.departments.first()
            if new_user.role == UserRole.FACULTY and dept:
                FacultyProfile.objects.get_or_create(
                    user=new_user,
                    defaults={
                        'college': new_user.college,
                        'department': dept,
                        'designation': 'Faculty Member',
                    }
                )

            invitation.status = 'ACCEPTED'
            invitation.accepted_at = timezone.now()
            invitation.save(update_fields=['status', 'accepted_at', 'updated_at'])

            # Recalculate tenant usage
            UsageLimitService.recalculate_tenant_usage(invitation.college)

            log_action(
                actor=new_user,
                action='INVITATION_ACCEPTED',
                instance=new_user,
                college=invitation.college,
                request=request,
                comment=f"User {new_user.email} accepted invitation and completed registration."
            )

        return Response({
            'success': True,
            'message': 'Account created successfully! You can now log in with your credentials.',
            'email': new_user.email,
        })


class SystemHealthView(APIView):
    """
    Super Admin System Health and Diagnostics Dashboard Endpoint.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        data = SystemHealthService.get_system_health()
        return Response(data)
