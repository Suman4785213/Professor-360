"""
Colleges App Serializers — Phase 11: Multi-College SaaS & Super Admin Control Center
Serializers for Colleges, Settings, Plans, Subscriptions, Feature Flags, Quotas, and Invitations.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import (
    College, Plan, Subscription, TenantFeatureFlag,
    TenantUsage, UserInvitation, SubscriptionStatus, BillingCycle,
    Invoice, PaymentTransaction, AdminFeatureOverride, BillingSupportTicket, BillingWebhookLog
)
from apps.accounts.models import User, UserRole, FacultyProfile


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = [
            'id', 'name', 'code', 'description', 'price_monthly', 'price_yearly',
            'max_users', 'max_departments', 'max_faculty', 'storage_limit_gb',
            'ai_processing_limit', 'max_reports_monthly', 'max_academic_years',
            'max_api_requests_monthly', 'currency', 'is_custom_enterprise',
            'features', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_details = PlanSerializer(source='plan', read_only=True)
    college_name = serializers.CharField(source='college.name', read_only=True)
    college_code = serializers.CharField(source='college.code', read_only=True)
    is_trial = serializers.BooleanField(read_only=True)
    trial_days_remaining = serializers.IntegerField(read_only=True)
    is_in_grace_period = serializers.BooleanField(read_only=True)
    is_restricted = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'college', 'college_name', 'college_code', 'plan', 'plan_details',
            'status', 'billing_cycle', 'start_date', 'current_period_start',
            'current_period_end', 'trial_ends_at', 'cancelled_at', 'cancel_at_period_end',
            'auto_renew', 'grace_period_days', 'pause_start', 'pause_end', 'provider',
            'customer_id', 'subscription_id', 'is_trial', 'trial_days_remaining',
            'is_in_grace_period', 'is_restricted', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceSerializer(serializers.ModelSerializer):
    college_name = serializers.CharField(source='college.name', read_only=True)
    college_code = serializers.CharField(source='college.code', read_only=True)
    plan_name = serializers.CharField(source='subscription.plan.name', read_only=True, default='')

    class Meta:
        model = Invoice
        fields = [
            'id', 'college', 'college_name', 'college_code', 'subscription', 'plan_name',
            'invoice_number', 'billing_period_start', 'billing_period_end',
            'amount', 'tax_name', 'tax_rate', 'tax_amount', 'total_amount',
            'currency', 'status', 'issue_date', 'due_date', 'paid_at',
            'provider_invoice_id', 'provider', 'pdf_url', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PaymentTransactionSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'college', 'invoice', 'invoice_number', 'amount', 'currency',
            'status', 'payment_reference', 'provider', 'payment_method',
            'error_message', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AdminFeatureOverrideSerializer(serializers.ModelSerializer):
    college_name = serializers.CharField(source='college.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    is_currently_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = AdminFeatureOverride
        fields = [
            'id', 'college', 'college_name', 'feature_key', 'is_enabled',
            'reason', 'valid_from', 'valid_until', 'created_by', 'created_by_name',
            'is_active', 'is_currently_valid', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class BillingSupportTicketSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    college_name = serializers.CharField(source='college.name', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True, default='')

    class Meta:
        model = BillingSupportTicket
        fields = [
            'id', 'college', 'college_name', 'ticket_type', 'subject', 'message',
            'status', 'invoice', 'invoice_number', 'created_by', 'created_by_name',
            'assigned_to', 'resolution_notes', 'task', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class TenantFeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantFeatureFlag
        fields = ['id', 'college', 'feature_key', 'is_enabled', 'reason', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class TenantUsageSerializer(serializers.ModelSerializer):
    storage_used_gb = serializers.FloatField(read_only=True)
    college_name = serializers.CharField(source='college.name', read_only=True)

    class Meta:
        model = TenantUsage
        fields = [
            'id', 'college', 'college_name', 'users_count', 'faculty_count',
            'departments_count', 'storage_used_bytes', 'storage_used_gb',
            'ai_jobs_this_month', 'reports_this_month', 'evidence_count',
            'tasks_count', 'last_calculated_at'
        ]
        read_only_fields = ['id', 'last_calculated_at']


class CollegeSerializer(serializers.Model_serializer if hasattr(serializers, 'Model_serializer') else serializers.ModelSerializer):
    departments_count = serializers.IntegerField(source='departments.count', read_only=True)
    faculty_count = serializers.IntegerField(source='users.count', read_only=True)
    active_subscription = SubscriptionSerializer(read_only=True)
    usage_summary = serializers.SerializerMethodField()

    class Meta:
        model = College
        fields = [
            'id', 'name', 'short_name', 'code', 'institution_code',
            'address', 'city', 'state', 'pincode', 'phone', 'email', 'website',
            'logo', 'branding_config', 'accreditation_type', 'naac_grade',
            'established_year', 'status', 'is_active', 'subscription_plan',
            'subscription_expiry', 'setup_step', 'setup_completed',
            'academic_year_format', 'date_format', 'timezone', 'default_report_format',
            'document_settings', 'notification_settings', 'ai_settings', 'framework_settings',
            'is_deleted', 'departments_count', 'faculty_count',
            'active_subscription', 'usage_summary', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_usage_summary(self, obj):
        from .services import UsageLimitService
        return UsageLimitService.get_usage_summary(obj)


class CollegeSettingsSerializer(serializers.ModelSerializer):
    """
    Dedicated serializer for updating /settings/college.
    Restricted to authorized college administrative roles (IQAC, College Management).
    """
    class Meta:
        model = College
        fields = [
            'name', 'short_name', 'address', 'city', 'state', 'pincode',
            'phone', 'email', 'website', 'logo', 'branding_config',
            'academic_year_format', 'date_format', 'timezone', 'default_report_format',
            'document_settings', 'notification_settings', 'ai_settings', 'framework_settings'
        ]


class CollegeCreateWithAdminSerializer(serializers.ModelSerializer):
    """
    Used by Super Admin in the College Onboarding Wizard to create college
    plus initial IQAC / Management administrator in one step.
    """
    admin_email = serializers.EmailField(write_only=True, required=False)
    admin_first_name = serializers.CharField(write_only=True, default='College', required=False)
    admin_last_name = serializers.CharField(write_only=True, default='Admin', required=False)
    admin_password = serializers.CharField(write_only=True, required=False)
    admin_role = serializers.ChoiceField(
        choices=[UserRole.IQAC, UserRole.COLLEGE_MANAGEMENT],
        default=UserRole.IQAC,
        write_only=True
    )
    plan_code = serializers.CharField(write_only=True, default='starter')

    class Meta:
        model = College
        fields = [
            'id', 'name', 'short_name', 'code', 'institution_code',
            'address', 'city', 'state', 'pincode', 'phone', 'email', 'website',
            'accreditation_type', 'naac_grade', 'established_year',
            'admin_email', 'admin_first_name', 'admin_last_name',
            'admin_password', 'admin_role', 'plan_code'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        # Strip write-only admin and subscription fields not belonging to the College model
        validated_data.pop('admin_email', None)
        validated_data.pop('admin_first_name', None)
        validated_data.pop('admin_last_name', None)
        validated_data.pop('admin_password', None)
        validated_data.pop('admin_role', None)
        validated_data.pop('plan_code', None)
        return super().create(validated_data)


class UserInvitationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    invited_by_name = serializers.CharField(source='invited_by.get_full_name', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = UserInvitation
        fields = [
            'id', 'college', 'email', 'role', 'department', 'department_name',
            'token', 'status', 'invited_by', 'invited_by_name',
            'expires_at', 'accepted_at', 'is_expired', 'created_at'
        ]
        read_only_fields = ['id', 'token', 'status', 'invited_by', 'expires_at', 'accepted_at', 'created_at']


class UserInvitationAcceptSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    first_name = serializers.CharField(required=True, max_length=100)
    last_name = serializers.CharField(required=True, max_length=100)
    password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        validate_password(data['password'])
        return data


class CollegeHealthSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for Super Admin College Health directory.
    """
    plan_name = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()
    users_count = serializers.IntegerField(source='users.count', read_only=True)
    departments_count = serializers.IntegerField(source='departments.count', read_only=True)
    storage_used_gb = serializers.SerializerMethodField()
    ai_jobs_count = serializers.SerializerMethodField()

    class Meta:
        model = College
        fields = [
            'id', 'name', 'code', 'status', 'is_active', 'plan_name',
            'subscription_status', 'users_count', 'departments_count',
            'storage_used_gb', 'ai_jobs_count', 'created_at'
        ]

    def get_plan_name(self, obj):
        sub = obj.active_subscription
        return sub.plan.name if sub and sub.plan else obj.subscription_plan

    def get_subscription_status(self, obj):
        sub = obj.active_subscription
        return sub.status if sub else ('ACTIVE' if obj.is_active else 'SUSPENDED')

    def get_storage_used_gb(self, obj):
        usage = getattr(obj, 'usage', None)
        return round(usage.storage_used_gb, 2) if usage else 0.0

    def get_ai_jobs_count(self, obj):
        usage = getattr(obj, 'usage', None)
        return usage.ai_jobs_this_month if usage else 0
