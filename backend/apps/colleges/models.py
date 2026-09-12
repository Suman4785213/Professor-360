"""
Colleges App Models — Phase 11: Multi-College SaaS & Super Admin Control Center
Tenant Model, SaaS Plans, Subscriptions, Feature Flags, Quota Usage, and User Invitations.
"""
import uuid
from django.db import models
from django.utils import timezone


class SubscriptionPlan(models.TextChoices):
    FREE = 'FREE', 'Free'
    BASIC = 'BASIC', 'Basic'
    PRO = 'PRO', 'Pro'
    ENTERPRISE = 'ENTERPRISE', 'Enterprise'


class AccreditationType(models.TextChoices):
    NAAC = 'NAAC', 'NAAC'
    NBA = 'NBA', 'NBA'
    NIRF = 'NIRF', 'NIRF'
    OTHER = 'OTHER', 'Other'


class CollegeStatus(models.TextChoices):
    SETUP = 'SETUP', 'Setup in Progress'
    ACTIVE = 'ACTIVE', 'Active'
    SUSPENDED = 'SUSPENDED', 'Suspended'
    ARCHIVED = 'ARCHIVED', 'Archived'


class College(models.Model):
    """
    Top-level tenant entity. Every institutional model references this model
    via a ForeignKey. Enforces strict multi-tenant isolation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Identity
    name = models.CharField(max_length=200)
    short_name = models.CharField(max_length=100, blank=True)
    code = models.CharField(max_length=50, unique=True, help_text="Short unique identifier, e.g. 'SITRC'")
    institution_code = models.CharField(max_length=50, blank=True, help_text="Official AISHE / Regulatory code")
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)

    # Branding & Customization
    logo = models.ImageField(upload_to='colleges/logos/', null=True, blank=True)
    branding_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Custom branding: primary_color, report_header, report_footer, contact_details"
    )

    # Accreditation
    accreditation_type = models.CharField(
        max_length=20,
        choices=AccreditationType.choices,
        default=AccreditationType.NAAC,
    )
    naac_grade = models.CharField(max_length=10, blank=True)
    established_year = models.PositiveIntegerField(null=True, blank=True)

    # SaaS Lifecycle & Status
    status = models.CharField(
        max_length=20,
        choices=CollegeStatus.choices,
        default=CollegeStatus.ACTIVE,
        db_index=True
    )
    is_active = models.BooleanField(default=True, help_text="Preserved for backwards compatibility")
    subscription_plan = models.CharField(
        max_length=20,
        choices=SubscriptionPlan.choices,
        default=SubscriptionPlan.FREE,
        help_text="Legacy plan field; modern SaaS subscriptions reference Plan model"
    )
    subscription_expiry = models.DateField(null=True, blank=True)

    # Onboarding Wizard State
    setup_step = models.PositiveSmallIntegerField(default=1, help_text="Current step in 9-step setup wizard")
    setup_completed = models.BooleanField(default=True, help_text="Whether initial onboarding wizard is completed")

    # Regional & Institutional Settings
    academic_year_format = models.CharField(max_length=20, default='YYYY-YYYY')
    date_format = models.CharField(max_length=20, default='YYYY-MM-DD')
    timezone = models.CharField(max_length=50, default='Asia/Kolkata')
    default_report_format = models.CharField(max_length=20, default='PDF')

    # Domain-specific Setting Dictionaries
    document_settings = models.JSONField(default=dict, blank=True, help_text="Max upload size, allowed mimes")
    notification_settings = models.JSONField(default=dict, blank=True, help_text="Channel defaults, digest frequency")
    ai_settings = models.JSONField(default=dict, blank=True, help_text="Confidence thresholds, auto-classification")
    framework_settings = models.JSONField(default=dict, blank=True, help_text="Active framework code, custom fields")

    # Soft Delete & Archival
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'colleges_college'
        verbose_name = 'College'
        verbose_name_plural = 'Colleges'
        ordering = ['name']
        indexes = [
            models.Index(fields=['status', 'is_deleted']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def is_suspended(self):
        return self.status == CollegeStatus.SUSPENDED or not self.is_active

    @property
    def active_subscription(self):
        return self.subscriptions.filter(
            status__in=['ACTIVE', 'TRIAL', 'PAST_DUE', 'PAUSED']
        ).order_by('-created_at').first()


class Plan(models.Model):
    """
    SaaS Plan model with configurable quotas, limits, pricing, and feature flags.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, help_text="e.g. Starter, Professional, Enterprise")
    code = models.CharField(max_length=50, unique=True, db_index=True, help_text="e.g. starter, professional, enterprise")
    description = models.TextField(blank=True)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # Quotas and Limits
    max_users = models.PositiveIntegerField(default=25)
    max_departments = models.PositiveIntegerField(default=5)
    max_faculty = models.PositiveIntegerField(default=50)
    storage_limit_gb = models.FloatField(default=10.0, help_text="Storage limit in Gigabytes")
    ai_processing_limit = models.PositiveIntegerField(default=100, help_text="AI processing jobs per month")
    max_reports_monthly = models.PositiveIntegerField(default=50, help_text="Report generation limit per month")
    max_academic_years = models.PositiveIntegerField(default=5)
    max_api_requests_monthly = models.PositiveIntegerField(default=10000, help_text="API requests per month")
    currency = models.CharField(max_length=10, default='INR')
    is_custom_enterprise = models.BooleanField(default=False)

    # Features dictionary
    features = models.JSONField(
        default=dict,
        blank=True,
        help_text="Dictionary of enabled features: AI_PROCESSING, AI_SEARCH, AQAR_WORKSPACE, SSR_WORKSPACE, ADVANCED_ANALYTICS, REPORT_GENERATION, AUTOMATION, BULK_EXPORT, API_ACCESS, INTEGRATIONS"
    )

    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'colleges_plan'
        ordering = ['price_monthly', 'name']

    def __str__(self):
        return f"{self.name} ({self.currency} {self.price_monthly}/mo)"


class SubscriptionStatus(models.TextChoices):
    TRIAL = 'TRIAL', 'Trial'
    ACTIVE = 'ACTIVE', 'Active'
    PAST_DUE = 'PAST_DUE', 'Past Due'
    PAUSED = 'PAUSED', 'Paused'
    SUSPENDED = 'SUSPENDED', 'Suspended'
    CANCELLED = 'CANCELLED', 'Cancelled'
    EXPIRED = 'EXPIRED', 'Expired'


class BillingCycle(models.TextChoices):
    MONTHLY = 'MONTHLY', 'Monthly'
    YEARLY = 'YEARLY', 'Yearly'


class Subscription(models.Model):
    """
    Tracks an institutional college tenant's active SaaS subscription lifecycle.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(College, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name='subscriptions')
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
        db_index=True
    )
    billing_cycle = models.CharField(
        max_length=20,
        choices=BillingCycle.choices,
        default=BillingCycle.YEARLY
    )
    start_date = models.DateField(default=timezone.now)
    current_period_start = models.DateTimeField(default=timezone.now)
    current_period_end = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    auto_renew = models.BooleanField(default=True)
    grace_period_days = models.PositiveIntegerField(default=14, help_text="Days of grace period after expiry before restricted")
    pause_start = models.DateTimeField(null=True, blank=True)
    pause_end = models.DateTimeField(null=True, blank=True)

    # Provider abstraction references
    provider = models.CharField(max_length=50, default='mock', help_text="Payment provider adapter name, e.g. mock, stripe, razorpay")
    customer_id = models.CharField(max_length=100, blank=True)
    subscription_id = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'colleges_subscription'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['college', 'status']),
        ]

    def __str__(self):
        return f"{self.college.code} — {self.plan.name} ({self.status})"

    @property
    def external_customer_id(self):
        return self.customer_id

    @external_customer_id.setter
    def external_customer_id(self, value):
        self.customer_id = value

    @property
    def external_subscription_id(self):
        return self.subscription_id

    @external_subscription_id.setter
    def external_subscription_id(self, value):
        self.subscription_id = value

    @property
    def is_trial(self):
        return self.status == SubscriptionStatus.TRIAL

    @property
    def trial_days_remaining(self):
        if not self.trial_ends_at or not self.is_trial:
            return 0
        diff = (self.trial_ends_at - timezone.now()).total_seconds()
        return max(0, int(diff // 86400) + 1 if diff > 0 else 0)

    @property
    def is_in_grace_period(self):
        """Returns True if the subscription is past due/expired but within the configurable grace period."""
        if self.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]:
            return False
        if self.status == SubscriptionStatus.PAST_DUE:
            ref_date = self.current_period_end or self.updated_at
            cutoff = ref_date + timezone.timedelta(days=self.grace_period_days)
            return timezone.now() <= cutoff
        if self.status == SubscriptionStatus.EXPIRED and self.current_period_end:
            cutoff = self.current_period_end + timezone.timedelta(days=self.grace_period_days)
            return timezone.now() <= cutoff
        return False

    @property
    def is_restricted(self):
        """Indicates if write operations and high-resource features should be locked."""
        if self.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]:
            return False
        if self.is_in_grace_period:
            return False
        return True


class FeatureFlagKey(models.TextChoices):
    AI_PROCESSING = 'AI_PROCESSING', 'AI Processing'
    AI_SEARCH = 'AI_SEARCH', 'AI Search & Grounded Trace'
    AQAR_WORKSPACE = 'AQAR_WORKSPACE', 'AQAR Compliance Workspace'
    SSR_WORKSPACE = 'SSR_WORKSPACE', 'SSR Preparation Workspace'
    ADVANCED_ANALYTICS = 'ADVANCED_ANALYTICS', 'Executive & Advanced Analytics'
    REPORT_GENERATION = 'REPORT_GENERATION', 'Automated Report Generation'
    AUTOMATION = 'AUTOMATION', 'Workflow & Task Automation'
    BULK_EXPORT = 'BULK_EXPORT', 'Institutional Bulk Export'
    API_ACCESS = 'API_ACCESS', 'Institutional API Access'
    INTEGRATIONS = 'INTEGRATIONS', 'Third-Party Integrations'


class InvoiceStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    OPEN = 'OPEN', 'Open'
    PAID = 'PAID', 'Paid'
    VOID = 'VOID', 'Void'
    UNCOLLECTIBLE = 'UNCOLLECTIBLE', 'Uncollectible'
    REFUNDED = 'REFUNDED', 'Refunded'


class Invoice(models.Model):
    """
    Commercial SaaS Billing Invoice.
    Never hardcoded; stores tax breakdown, currency, and period details.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(College, on_delete=models.CASCADE, related_name='invoices')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    billing_period_start = models.DateTimeField()
    billing_period_end = models.DateTimeField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Base subtotal amount before tax")
    tax_name = models.CharField(max_length=50, default='GST', help_text="Configurable tax name, e.g. GST, VAT, Sales Tax")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00, help_text="Tax rate percentage")
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total payable amount")
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.OPEN,
        db_index=True
    )
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    provider_invoice_id = models.CharField(max_length=100, blank=True)
    provider = models.CharField(max_length=50, default='mock')
    pdf_url = models.CharField(max_length=500, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'colleges_invoice'
        ordering = ['-issue_date', '-created_at']
        indexes = [
            models.Index(fields=['college', 'status']),
            models.Index(fields=['invoice_number']),
        ]

    def __str__(self):
        return f"Invoice #{self.invoice_number} — {self.college.code} ({self.currency} {self.total_amount})"


class PaymentStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    SUCCESS = 'SUCCESS', 'Success'
    FAILED = 'FAILED', 'Failed'
    REFUNDED = 'REFUNDED', 'Refunded'


class PaymentTransaction(models.Model):
    """
    Immutable ledger of payment attempts and transaction outcomes.
    Never stores sensitive raw card numbers or CVV.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(College, on_delete=models.CASCADE, related_name='payments')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True
    )
    payment_reference = models.CharField(max_length=100, unique=True, db_index=True)
    provider = models.CharField(max_length=50, default='mock')
    payment_method = models.CharField(max_length=50, default='CARD', help_text="e.g. CARD, UPI, NETBANKING, WIRE")
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'colleges_paymenttransaction'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['college', 'status']),
            models.Index(fields=['payment_reference']),
        ]

    def __str__(self):
        return f"Payment {self.payment_reference} ({self.currency} {self.amount}) — {self.status}"


class AdminFeatureOverride(models.Model):
    """
    Controlled manual temporary feature overrides granted by Super Admin.
    Every override must have a business reason, a valid time window, and an audit trail.
    Permanent hidden overrides are strictly prevented.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(College, on_delete=models.CASCADE, related_name='admin_feature_overrides')
    feature_key = models.CharField(max_length=50, choices=FeatureFlagKey.choices, db_index=True)
    is_enabled = models.BooleanField(default=True)
    reason = models.TextField(help_text="Mandatory business reason for granting temporary feature access")
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(help_text="Mandatory expiration date for the temporary override")
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='created_feature_overrides'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'colleges_adminfeatureoverride'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['college', 'feature_key', 'is_active']),
            models.Index(fields=['valid_until']),
        ]

    def __str__(self):
        return f"Override for {self.college.code}: {self.feature_key} until {self.valid_until.strftime('%Y-%m-%d')}"

    @property
    def is_currently_valid(self):
        now = timezone.now()
        return self.is_active and (self.valid_from <= now <= self.valid_until)


class BillingWebhookLog(models.Model):
    """
    Audit log for inbound billing webhooks ensuring idempotency,
    replay protection, and signature verification.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_id = models.CharField(max_length=100, unique=True, db_index=True)
    provider = models.CharField(max_length=50, default='mock')
    event_type = models.CharField(max_length=100, db_index=True)
    college = models.ForeignKey(College, on_delete=models.SET_NULL, null=True, blank=True, related_name='billing_webhooks')
    payload = models.JSONField(default=dict)
    headers = models.JSONField(default=dict)
    is_processed = models.BooleanField(default=False)
    is_valid = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'colleges_billingwebhooklog'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_id']),
            models.Index(fields=['event_type']),
        ]

    def __str__(self):
        return f"Webhook {self.event_id} ({self.event_type}) — {'Processed' if self.is_processed else 'Pending'}"


class BillingTicketType(models.TextChoices):
    PAYMENT_ISSUE = 'PAYMENT_ISSUE', 'Payment Issue'
    BILLING_QUESTION = 'BILLING_QUESTION', 'Billing Question'
    INVOICE_QUERY = 'INVOICE_QUERY', 'Invoice Issue'
    PLAN_CHANGE_REQUEST = 'PLAN_CHANGE_REQUEST', 'Plan Change Request'
    OTHER = 'OTHER', 'Other'


class BillingTicketStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    RESOLVED = 'RESOLVED', 'Resolved'
    CLOSED = 'CLOSED', 'Closed'


class BillingSupportTicket(models.Model):
    """
    Tenant billing support ticket linked to existing task and communication workflows.
    Does not create a detached support platform.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(College, on_delete=models.CASCADE, related_name='billing_tickets')
    ticket_type = models.CharField(max_length=30, choices=BillingTicketType.choices)
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=BillingTicketStatus.choices,
        default=BillingTicketStatus.OPEN,
        db_index=True
    )
    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets')
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='billing_tickets'
    )
    assigned_to = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_billing_tickets'
    )
    resolution_notes = models.TextField(blank=True)
    task = models.ForeignKey(
        'notifications.IQACTask',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='billing_tickets'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'colleges_billingsupportticket'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['college', 'status']),
        ]

    def __str__(self):
        return f"Ticket #{str(self.id)[:8]} — {self.subject} ({self.status})"


class TenantFeatureFlag(models.Model):
    """
    Tenant-specific feature flag overrides managed by Super Admin.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(College, on_delete=models.CASCADE, related_name='feature_flags')
    feature_key = models.CharField(max_length=50, choices=FeatureFlagKey.choices, db_index=True)
    is_enabled = models.BooleanField(default=True)
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'colleges_tenantfeatureflag'
        unique_together = [('college', 'feature_key')]
        ordering = ['feature_key']

    def __str__(self):
        return f"{self.college.code} — {self.feature_key}: {'Enabled' if self.is_enabled else 'Disabled'}"


class TenantUsage(models.Model):
    """
    Cached aggregated resource tracking per college. Avoids expensive DB recalculations on every request.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.OneToOneField(College, on_delete=models.CASCADE, related_name='usage')
    users_count = models.PositiveIntegerField(default=0)
    faculty_count = models.PositiveIntegerField(default=0)
    departments_count = models.PositiveIntegerField(default=0)
    storage_used_bytes = models.BigIntegerField(default=0)
    ai_jobs_this_month = models.PositiveIntegerField(default=0)
    reports_this_month = models.PositiveIntegerField(default=0)
    evidence_count = models.PositiveIntegerField(default=0)
    tasks_count = models.PositiveIntegerField(default=0)
    last_calculated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'colleges_tenantusage'

    def __str__(self):
        return f"Usage for {self.college.code} (Users: {self.users_count}, Storage: {self.storage_used_gb:.2f} GB)"

    @property
    def storage_used_gb(self):
        return self.storage_used_bytes / (1024 * 1024 * 1024)


class InvitationStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    ACCEPTED = 'ACCEPTED', 'Accepted'
    EXPIRED = 'EXPIRED', 'Expired'
    CANCELLED = 'CANCELLED', 'Cancelled'


class UserInvitation(models.Model):
    """
    Tokenized user invitation system for secure onboarding.
    Prevents unauthorized self-privilege escalation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(College, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField(db_index=True)
    role = models.CharField(max_length=30)
    department = models.ForeignKey('departments.Department', on_delete=models.SET_NULL, null=True, blank=True)
    token = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=InvitationStatus.choices,
        default=InvitationStatus.PENDING,
        db_index=True
    )
    invited_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_invitations'
    )
    expires_at = models.DateTimeField(db_index=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'colleges_userinvitation'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['college', 'status']),
            models.Index(fields=['token', 'status']),
        ]

    def __str__(self):
        return f"Invite: {self.email} ({self.role}) — {self.status}"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at or self.status == InvitationStatus.EXPIRED
