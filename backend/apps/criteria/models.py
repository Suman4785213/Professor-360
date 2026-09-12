"""
Criteria app models — Phase 5: IQAC Criteria, Metrics & Evidence Mapping
Configurable accreditation framework with real database progress tracking.
"""
import uuid
from django.db import models


class Framework(models.Model):
    """
    Accreditation framework or assessment version (e.g. NAAC RAF 2024, NIRF 2025, Demo Framework 2026).
    Enables multi-framework and version switching without database schema rewrites.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='frameworks'
    )
    name = models.CharField(max_length=300, db_index=True)
    code = models.CharField(max_length=50, db_index=True)
    version = models.CharField(max_length=50, default='2024.1')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'criteria_framework'
        ordering = ['name']
        indexes = [
            models.Index(fields=['college', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.version})"


class Section(models.Model):
    """
    High-level Section in an accreditation framework (e.g. Part A: Institutional Profile, Part B: Criteria).
    Enables Section -> Criterion -> Metric hierarchical aggregation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sections'
    )
    framework_ref = models.ForeignKey(
        Framework,
        on_delete=models.CASCADE,
        related_name='sections'
    )
    name = models.CharField(max_length=300, db_index=True)
    code = models.CharField(max_length=50, db_index=True)
    description = models.TextField(blank=True)
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'criteria_section'
        ordering = ['display_order', 'name']
        indexes = [
            models.Index(fields=['framework_ref', 'is_active']),
            models.Index(fields=['college', 'is_active']),
        ]

    def __str__(self):
        return f"{self.code}: {self.name}"


class Criterion(models.Model):
    """
    Core Criterion under an accreditation framework (e.g. Criterion 1: Curricular Aspects).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey('colleges.College', on_delete=models.CASCADE, related_name='criteria')
    framework = models.CharField(max_length=50, default='NAAC')
    framework_ref = models.ForeignKey(
        Framework,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='criteria'
    )
    section = models.ForeignKey(
        Section,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='criteria'
    )
    number = models.CharField(max_length=20, db_index=True)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    weightage = models.DecimalField(max_digits=6, decimal_places=2, default=100.0)
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'criteria_criterion'
        unique_together = [('college', 'framework', 'number')]
        ordering = ['display_order', 'number']
        indexes = [
            models.Index(fields=['college', 'is_active']),
            models.Index(fields=['framework_ref', 'is_active']),
        ]

    def __str__(self):
        return f"Criterion {self.number}: {self.title}"


class Metric(models.Model):
    """
    Measurable Quality Indicator / Metric under a Criterion (e.g. Metric 1.1.1, 2.4.2).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey('colleges.College', on_delete=models.CASCADE, related_name='metrics')
    criterion = models.ForeignKey(Criterion, on_delete=models.CASCADE, related_name='metrics')
    number = models.CharField(max_length=30, db_index=True)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    weightage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    display_order = models.IntegerField(default=0)
    is_required = models.BooleanField(default=True)
    benchmark_count = models.IntegerField(
        default=5,
        help_text="Expected target count of verified evidence items for complete availability"
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'criteria_metric'
        ordering = ['display_order', 'number']
        indexes = [
            models.Index(fields=['criterion', 'is_active']),
            models.Index(fields=['college', 'is_active']),
        ]

    def __str__(self):
        return f"Metric {self.number}: {self.title}"


class EvidenceRequirement(models.Model):
    """
    Configurable documentation benchmark/requirement for a Metric (Section 15).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE, related_name='requirements')
    name = models.CharField(max_length=300)
    document_category = models.ForeignKey(
        'activities.DocumentCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evidence_requirements'
    )
    description = models.TextField(blank=True)
    required_count = models.IntegerField(default=5)
    is_mandatory = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'criteria_evidencerequirement'
        ordering = ['name']

    def __str__(self):
        return f"{self.metric.number} Requirement: {self.name} ({self.required_count} proofs)"


class EvidenceMapping(models.Model):
    """
    Official institutional mapping connecting a verified Evidence record to an accreditation Metric.
    Supports many-to-many relationships without duplicating the underlying evidence documents.
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('ARCHIVED', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey('colleges.College', on_delete=models.CASCADE, related_name='evidence_mappings')
    criterion = models.ForeignKey(
        Criterion,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='evidence_mappings'
    )
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE, related_name='evidence_mappings')
    evidence = models.ForeignKey('evidence.Evidence', on_delete=models.CASCADE, related_name='criterion_mappings')
    academic_year = models.ForeignKey(
        'academic_years.AcademicYear',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evidence_mappings'
    )
    mapped_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evidence_mappings'
    )
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE', db_index=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='archived_evidence_mappings'
    )
    archive_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'criteria_evidencemapping'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['metric', 'status']),
            models.Index(fields=['criterion', 'status']),
            models.Index(fields=['evidence', 'status']),
            models.Index(fields=['college', 'academic_year', 'status']),
        ]

    def save(self, *args, **kwargs):
        if self.metric and not self.criterion_id:
            self.criterion = self.metric.criterion
        if self.evidence and not self.college_id:
            self.college = self.evidence.college
        if self.evidence and not self.academic_year_id:
            self.academic_year = self.evidence.academic_year
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.metric.number} ↔ {self.evidence.title[:40]}"


class DataRequirementType(models.TextChoices):
    NUMBER = 'NUMBER', 'Number'
    PERCENTAGE = 'PERCENTAGE', 'Percentage'
    COUNT = 'COUNT', 'Count'
    DATE = 'DATE', 'Date'
    DURATION = 'DURATION', 'Duration'
    FACULTY_LIST = 'FACULTY_LIST', 'Faculty List'
    STUDENT_LIST = 'STUDENT_LIST', 'Student List'
    DEPARTMENT_LIST = 'DEPARTMENT_LIST', 'Department List'
    ACTIVITY_LIST = 'ACTIVITY_LIST', 'Activity List'
    PUBLICATION_LIST = 'PUBLICATION_LIST', 'Publication List'
    FINANCIAL = 'FINANCIAL', 'Financial Data'
    EVIDENCE_DOCUMENTS = 'EVIDENCE_DOCUMENTS', 'Evidence Documents'


class CalculationSourceType(models.TextChoices):
    AUTO_VERIFIED_ACTIVITIES = 'AUTO_VERIFIED_ACTIVITIES', 'Auto-Calculate from Verified Activities'
    AUTO_VERIFIED_EVIDENCE = 'AUTO_VERIFIED_EVIDENCE', 'Auto-Calculate from Verified Evidence'
    AUTO_FACULTY_COUNT = 'AUTO_FACULTY_COUNT', 'Auto-Calculate from Faculty Roster'
    AUTO_DEPARTMENT_COUNT = 'AUTO_DEPARTMENT_COUNT', 'Auto-Calculate from Department Roster'
    MANUAL_ENTRY = 'MANUAL_ENTRY', 'Manual IQAC Input'


class MetricDataRequirement(models.Model):
    """
    Configurable structured data field requirement for an accreditation Metric (Section 7).
    Calculates values automatically from verified institutional data whenever possible.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE, related_name='data_requirements')
    field_name = models.CharField(max_length=200)
    data_type = models.CharField(
        max_length=50,
        choices=DataRequirementType.choices,
        default=DataRequirementType.COUNT
    )
    calculation_source = models.CharField(
        max_length=50,
        choices=CalculationSourceType.choices,
        default=CalculationSourceType.AUTO_VERIFIED_ACTIVITIES
    )
    activity_category_code = models.CharField(
        max_length=50,
        blank=True,
        help_text="Optional category code filter (e.g. FDP, WORKSHOP, PUBLICATION)"
    )
    benchmark_value = models.CharField(max_length=100, blank=True, help_text="Target numerical or text benchmark")
    description = models.TextField(blank=True)
    is_mandatory = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'criteria_metricdatarequirement'
        ordering = ['field_name']

    def __str__(self):
        return f"{self.metric.number} Data: {self.field_name} ({self.data_type})"


class MetricDataValue(models.Model):
    """
    Computed or manually recorded structured value for a Metric Data Requirement per Academic Year.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requirement = models.ForeignKey(MetricDataRequirement, on_delete=models.CASCADE, related_name='values')
    college = models.ForeignKey('colleges.College', on_delete=models.CASCADE, related_name='metric_data_values')
    academic_year = models.ForeignKey(
        'academic_years.AcademicYear',
        on_delete=models.CASCADE,
        related_name='metric_data_values'
    )
    calculated_value = models.JSONField(default=dict, blank=True)
    manual_override_value = models.JSONField(null=True, blank=True)
    is_overridden = models.BooleanField(default=False)
    override_reason = models.TextField(blank=True)
    updated_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'criteria_metricdatavalue'
        unique_together = [('requirement', 'college', 'academic_year')]

    def get_effective_value(self):
        if self.is_overridden and self.manual_override_value is not None:
            return self.manual_override_value
        return self.calculated_value

