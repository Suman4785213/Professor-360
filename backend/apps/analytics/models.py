"""
Analytics Models — Phase 9: Advanced Analytics & Executive Intelligence
Snapshot storage, grounded AI insights persistence, and scheduled report configurations.
"""
import uuid
from django.db import models


class InsightCategory(models.TextChoices):
    GROWTH = 'GROWTH', 'Evidence & Activity Growth'
    BOTTLENECK = 'BOTTLENECK', 'Pipeline Bottleneck'
    GAP = 'GAP', 'Evidence & Metric Gap'
    RISK = 'RISK', 'Preparation Risk'
    QUALITY = 'QUALITY', 'Data Quality Hygiene'
    RECOMMENDATION = 'RECOMMENDATION', 'Strategic Recommendation'


class InsightSeverity(models.TextChoices):
    INFO = 'INFO', 'Informational'
    LOW = 'LOW', 'Low Attention'
    MEDIUM = 'MEDIUM', 'Moderate Attention'
    HIGH = 'HIGH', 'High Priority'
    CRITICAL = 'CRITICAL', 'Urgent Action Required'


class ExecutiveSnapshot(models.Model):
    """
    Historical periodic snapshot for fast cross-year trend detection and executive reporting.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='executive_snapshots'
    )
    academic_year = models.ForeignKey(
        'academic_years.AcademicYear',
        on_delete=models.CASCADE,
        related_name='executive_snapshots'
    )
    snapshot_date = models.DateField(db_index=True)
    total_faculty = models.IntegerField(default=0)
    total_activities = models.IntegerField(default=0)
    verified_evidence_count = models.IntegerField(default=0)
    pending_verification_count = models.IntegerField(default=0)
    aqar_completeness_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    ssr_completeness_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    data_quality_score = models.DecimalField(max_digits=5, decimal_places=2, default=100.0)
    bottleneck_count = models.IntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'analytics_executivesnapshot'
        ordering = ['-snapshot_date']
        indexes = [
            models.Index(fields=['college', 'academic_year', 'snapshot_date']),
        ]

    def __str__(self):
        return f"{self.college.code} Snapshot ({self.academic_year.name}) - {self.snapshot_date}"


class AIExecutiveInsight(models.Model):
    """
    Persisted advisory AI executive insights grounded strictly in real database aggregates.
    AI NEVER invents numbers. Every insight links to underlying source statistics.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='ai_insights'
    )
    academic_year = models.ForeignKey(
        'academic_years.AcademicYear',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_insights'
    )
    category = models.CharField(
        max_length=30,
        choices=InsightCategory.choices,
        default=InsightCategory.GROWTH,
        db_index=True
    )
    title = models.CharField(max_length=255)
    narrative = models.TextField()
    severity = models.CharField(
        max_length=20,
        choices=InsightSeverity.choices,
        default=InsightSeverity.INFO,
        db_index=True
    )
    # Underlying verified source stats used for grounding
    source_metrics = models.JSONField(default=dict)
    affected_departments = models.ManyToManyField(
        'departments.Department',
        blank=True,
        related_name='ai_insights'
    )
    time_period = models.CharField(max_length=100, default='Current Academic Year')
    recommended_action = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'analytics_aiexecutiveinsight'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['college', 'category', 'is_active']),
        ]

    def __str__(self):
        return f"[{self.category}] {self.title} ({self.college.code})"


class ScheduledAnalyticsConfig(models.Model):
    """
    Foundation for periodic scheduled executive analytics digests.
    """
    FREQUENCY_CHOICES = [
        ('WEEKLY', 'Weekly Executive Digest'),
        ('MONTHLY', 'Monthly Quality Review'),
        ('QUARTERLY', 'Quarterly Criteria Benchmark'),
        ('ANNUAL', 'Annual Accreditation Report'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='scheduled_analytics'
    )
    report_title = models.CharField(max_length=200)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='MONTHLY')
    recipient_role = models.CharField(max_length=50, default='COLLEGE_MANAGEMENT')
    target_email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'analytics_scheduledanalyticsconfig'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.report_title} ({self.frequency}) - {self.college.code}"


