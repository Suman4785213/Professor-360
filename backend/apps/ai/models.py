"""
AI Certificate Intelligence — Models
Processing jobs, extraction results, field confidence scores,
classification results, and human correction audit records.
"""
import uuid
from django.db import models


class AIProcessingStatus(models.TextChoices):
    UPLOADED = 'UPLOADED', 'Uploaded'
    PROCESSING = 'PROCESSING', 'Processing'
    PROCESSED = 'PROCESSED', 'Processed'
    REVIEW_REQUIRED = 'REVIEW_REQUIRED', 'Review Required'
    CONFIRMED = 'CONFIRMED', 'Confirmed'
    FAILED = 'FAILED', 'Failed'


class AIDocumentType(models.TextChoices):
    CERTIFICATE = 'CERTIFICATE', 'Certificate'
    PARTICIPATION = 'PARTICIPATION', 'Participation Certificate'
    COMPLETION = 'COMPLETION', 'Completion Certificate'
    APPOINTMENT_LETTER = 'APPOINTMENT_LETTER', 'Appointment Letter'
    AWARD = 'AWARD', 'Award / Honour'
    PUBLICATION_PROOF = 'PUBLICATION_PROOF', 'Publication Proof'
    RESEARCH_DOCUMENT = 'RESEARCH_DOCUMENT', 'Research Document'
    EVENT_DOCUMENT = 'EVENT_DOCUMENT', 'Event Document'
    OTHER_EVIDENCE = 'OTHER_EVIDENCE', 'Other Evidence'


def ai_upload_path(instance, filename):
    return f"colleges/{instance.college_id}/ai_temp/{filename}"


class AIProcessingJob(models.Model):
    """
    Tracks a document processed by the AI extraction pipeline.
    Preserves original file, provider metadata, and processing lifecycle.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='ai_jobs',
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='ai_jobs',
    )
    # Linked activity and official document after user confirmation
    activity = models.ForeignKey(
        'activities.Activity',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_jobs',
    )
    document = models.ForeignKey(
        'activities.Document',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_jobs',
    )

    file = models.FileField(upload_to=ai_upload_path, max_length=500)
    file_name = models.CharField(max_length=300)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    mime_type = models.CharField(max_length=100)
    file_hash = models.CharField(max_length=64, blank=True, db_index=True, help_text="SHA-256 hash")

    status = models.CharField(
        max_length=30,
        choices=AIProcessingStatus.choices,
        default=AIProcessingStatus.UPLOADED,
        db_index=True,
    )
    provider = models.CharField(max_length=50, blank=True, default='auto')
    model_name = models.CharField(max_length=50, blank=True)
    execution_time_ms = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_processing_job'
        verbose_name = 'AI Processing Job'
        verbose_name_plural = 'AI Processing Jobs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['college', 'status']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f"AI Job {self.id} — {self.file_name} [{self.status}]"


class AIExtractionResult(models.Model):
    """
    Stores structured extracted data from the certificate.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.OneToOneField(
        AIProcessingJob,
        on_delete=models.CASCADE,
        related_name='extraction_result',
    )
    ai_document_type = models.CharField(
        max_length=50,
        choices=AIDocumentType.choices,
        default=AIDocumentType.CERTIFICATE,
    )
    raw_text = models.TextField(blank=True, help_text="OCR or extracted plain text")
    extracted_data = models.JSONField(default=dict, help_text="Normalized field key-value pairs")
    overall_confidence = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_extraction_result'
        verbose_name = 'AI Extraction Result'

    def __str__(self):
        return f"Extraction for Job {self.job_id} ({self.overall_confidence} confidence)"


class AIFieldConfidence(models.Model):
    """
    Field-level confidence granularity.
    Enables frontend to render high/medium/low confidence indicators.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        AIProcessingJob,
        on_delete=models.CASCADE,
        related_name='field_confidences',
    )
    field_name = models.CharField(max_length=100)
    value = models.TextField(blank=True)
    confidence = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    is_detected = models.BooleanField(default=True)

    class Meta:
        db_table = 'ai_field_confidence'
        verbose_name = 'AI Field Confidence'
        ordering = ['field_name']
        unique_together = ('job', 'field_name')

    def __str__(self):
        return f"{self.field_name}: {self.confidence} [{self.value[:30]}]"


class AIClassificationResult(models.Model):
    """
    Activity category suggestion matched against College's active categories.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.OneToOneField(
        AIProcessingJob,
        on_delete=models.CASCADE,
        related_name='classification_result',
    )
    suggested_category = models.ForeignKey(
        'activities.ActivityCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_classifications',
    )
    suggested_code = models.CharField(max_length=50, blank=True)
    confidence = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    alternative_categories = models.JSONField(default=list, blank=True)
    explanation = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_classification_result'
        verbose_name = 'AI Classification Result'

    def __str__(self):
        cat_name = self.suggested_category.name if self.suggested_category else self.suggested_code
        return f"Suggested Category: {cat_name} ({self.confidence})"


class AICorrectionLog(models.Model):
    """
    Tracks faculty edits to AI-extracted values prior to submission.
    Provides foundational metrics for AI accuracy and field correction rates.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        AIProcessingJob,
        on_delete=models.CASCADE,
        related_name='corrections',
    )
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='ai_corrections',
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='ai_corrections',
    )
    field_name = models.CharField(max_length=100)
    original_value = models.TextField(blank=True)
    corrected_value = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_correction_log'
        verbose_name = 'AI Correction Log'
        ordering = ['-created_at']

    def __str__(self):
        return f"Correction on {self.field_name} by {self.user.email}"


class AICopilotConfidenceLevel(models.TextChoices):
    HIGH = 'HIGH', 'High Confidence — Based on Verified Data'
    NEEDS_REVIEW = 'NEEDS_REVIEW', 'Needs Review — AI Interpretation'
    NOT_ENOUGH_DATA = 'NOT_ENOUGH_DATA', 'Not Enough Data'


class AICopilotMessageRole(models.TextChoices):
    USER = 'user', 'User'
    ASSISTANT = 'assistant', 'Assistant'
    SYSTEM = 'system', 'System'


class AICopilotConversation(models.Model):
    """
    Session container for IQAC AI Copilot conversations.
    Enforces tenant isolation and role awareness.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='copilot_conversations',
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='copilot_conversations',
    )
    title = models.CharField(max_length=255, default='New Conversation')
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_copilot_conversation'
        verbose_name = 'AI Copilot Conversation'
        verbose_name_plural = 'AI Copilot Conversations'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['college', 'user']),
            models.Index(fields=['user', '-updated_at']),
        ]

    def __str__(self):
        return f"{self.title} ({self.user.email})"


class AICopilotMessage(models.Model):
    """
    Individual message turn in a Copilot conversation.
    Stores prompt/answer, provenance sources, confidence, and action proposals.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        AICopilotConversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role = models.CharField(
        max_length=20,
        choices=AICopilotMessageRole.choices,
        default=AICopilotMessageRole.USER,
    )
    content = models.TextField()
    intent = models.CharField(max_length=100, blank=True)
    confidence_level = models.CharField(
        max_length=30,
        choices=AICopilotConfidenceLevel.choices,
        default=AICopilotConfidenceLevel.HIGH,
    )
    sources = models.JSONField(
        default=list,
        blank=True,
        help_text="Structured provenance: [{type, id, title, academic_year, department, is_verified, url}]"
    )
    suggested_actions = models.JSONField(
        default=list,
        blank=True,
        help_text="Contextual action recommendations: [{label, action, params}]"
    )
    pending_action = models.JSONField(
        null=True,
        blank=True,
        help_text="Write action proposal requiring explicit confirmation: {type, title, params, summary, status}"
    )
    action_confirmed = models.BooleanField(null=True, blank=True)
    model_used = models.CharField(max_length=100, blank=True)
    execution_time_ms = models.PositiveIntegerField(default=0)
    tokens_used = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'ai_copilot_message'
        verbose_name = 'AI Copilot Message'
        verbose_name_plural = 'AI Copilot Messages'
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role}] {self.content[:40]}..."


class AICopilotFeedback(models.Model):
    """
    User satisfaction feedback and correction signals for Copilot responses.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        AICopilotMessage,
        on_delete=models.CASCADE,
        related_name='feedbacks',
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='copilot_feedbacks',
    )
    is_helpful = models.BooleanField()
    reason = models.CharField(
        max_length=50,
        blank=True,
        choices=[
            ('INCORRECT', 'Incorrect data / facts'),
            ('MISSING_SOURCE', 'Missing or invalid source citations'),
            ('NOT_RELEVANT', 'Not relevant to question'),
            ('TOO_VAGUE', 'Too vague or incomplete'),
            ('OTHER', 'Other'),
        ],
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_copilot_feedback'
        verbose_name = 'AI Copilot Feedback'
        verbose_name_plural = 'AI Copilot Feedbacks'
        ordering = ['-created_at']

    def __str__(self):
        status = "Helpful" if self.is_helpful else "Not Helpful"
        return f"{status} feedback on msg {self.message_id} by {self.user.email}"


class AICopilotBenchmark(models.Model):
    """
    Standard evaluation benchmarks for continuous quality and anti-hallucination monitoring.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.CharField(max_length=500)
    target_role = models.CharField(max_length=50)
    expected_intent = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_copilot_benchmark'
        verbose_name = 'AI Copilot Benchmark'
        verbose_name_plural = 'AI Copilot Benchmarks'

    def __str__(self):
        return f"[{self.target_role}] {self.question[:50]}"

