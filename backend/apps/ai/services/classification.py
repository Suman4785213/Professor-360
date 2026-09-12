"""
Category Classification Service
Matches extracted text against the college's active ActivityCategory database records.
"""
from typing import Dict, Any
from django.db.models import Q
from apps.activities.models import ActivityCategory
from apps.ai.models import AIProcessingJob, AIClassificationResult
from apps.ai.providers import get_ai_provider


class CategoryClassificationService:
    @staticmethod
    def classify_for_job(job: AIProcessingJob, provider_override: str = None) -> AIClassificationResult:
        """
        Classifies the document against the college's active categories and saves AIClassificationResult.
        """
        user = job.user
        college = job.college

        # Fetch active categories for this college or global defaults
        categories_qs = ActivityCategory.objects.filter(
            Q(college=college) | Q(college__isnull=True),
            is_active=True
        ).order_by('name')

        categories_list = [
            {'id': str(c.id), 'code': c.code, 'name': c.name}
            for c in categories_qs
        ]

        # Use extraction raw text or field values
        text_to_classify = ""
        if hasattr(job, 'extraction_result') and job.extraction_result:
            ext = job.extraction_result
            title = ext.extracted_data.get('activity_title', {}).get('value', '')
            desc = ext.extracted_data.get('description', {}).get('value', '')
            text_to_classify = f"{title}\n{desc}\n{ext.raw_text[:2000]}"
        else:
            text_to_classify = job.file_name

        provider = get_ai_provider(provider_override)
        res = provider.classify_activity_category(text_to_classify, categories_list)

        suggested_id = res.get('suggested_category_id')
        suggested_category = None
        if suggested_id:
            try:
                suggested_category = ActivityCategory.objects.get(id=suggested_id)
            except ActivityCategory.DoesNotExist:
                suggested_category = None

        classification_obj, _ = AIClassificationResult.objects.update_or_create(
            job=job,
            defaults={
                'suggested_category': suggested_category,
                'suggested_code': res.get('suggested_code', 'OTHER'),
                'confidence': res.get('confidence', 0.0),
                'alternative_categories': res.get('alternative_categories', []),
                'explanation': res.get('explanation', ''),
            }
        )

        return classification_obj
