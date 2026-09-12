"""
Document Extraction Service
Handles text extraction from PDF and image files, orchestrates AI extraction,
and persists structured extraction results and field confidences.
"""
import io
import time
import hashlib
from typing import Dict, Any, Tuple
from django.core.files.uploadedfile import UploadedFile
from pypdf import PdfReader

from apps.ai.models import AIProcessingJob, AIExtractionResult, AIFieldConfidence, AIProcessingStatus
from apps.ai.providers import get_ai_provider


class DocumentExtractionService:
    @staticmethod
    def extract_text_from_file(file_obj) -> str:
        """
        Extracts plain text from an uploaded file (PDF or text-based).
        """
        extracted_text = ""
        filename = getattr(file_obj, 'name', '').lower()

        try:
            # Rewind file pointer
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)

            if filename.endswith('.pdf'):
                reader = PdfReader(file_obj)
                pages_text = []
                for i, page in enumerate(reader.pages[:10]):  # First 10 pages max
                    t = page.extract_text()
                    if t:
                        pages_text.append(t)
                extracted_text = "\n\n".join(pages_text)
            else:
                # For images or plain files: if bytes, attempt string decode
                if hasattr(file_obj, 'read'):
                    content = file_obj.read()
                    try:
                        extracted_text = content.decode('utf-8', errors='ignore')
                    except Exception:
                        extracted_text = ""
        except Exception as e:
            extracted_text = f"Text extraction warning: {str(e)}"
        finally:
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)

        return extracted_text.strip()

    @classmethod
    def process_document_job(
        cls, job: AIProcessingJob, provider_override: str = None
    ) -> Tuple[AIExtractionResult, Dict[str, Any]]:
        """
        Runs the extraction pipeline for an AIProcessingJob.
        """
        start_time = time.time()
        job.status = AIProcessingStatus.PROCESSING
        job.save(update_fields=['status', 'updated_at'])

        provider = get_ai_provider(provider_override)
        job.provider = provider.name
        job.model_name = provider.model_name

        try:
            raw_text = cls.extract_text_from_file(job.file)
            extraction_data = provider.extract_certificate_fields(raw_text, job.file_name)

            fields_data = extraction_data.get('fields', {})
            doc_type = extraction_data.get('document_type', 'CERTIFICATE')
            overall_conf = extraction_data.get('overall_confidence', 0.0)

            # 1. Create or update AIExtractionResult
            res, _ = AIExtractionResult.objects.update_or_create(
                job=job,
                defaults={
                    'ai_document_type': doc_type,
                    'raw_text': raw_text[:8000],
                    'extracted_data': fields_data,
                    'overall_confidence': overall_conf,
                }
            )

            # 2. Clear old field confidences and recreate
            AIFieldConfidence.objects.filter(job=job).delete()
            conf_objs = []
            for f_name, f_info in fields_data.items():
                if isinstance(f_info, dict):
                    conf_objs.append(
                        AIFieldConfidence(
                            job=job,
                            field_name=f_name,
                            value=str(f_info.get('value') or ''),
                            confidence=f_info.get('confidence', 0.0),
                            is_detected=bool(f_info.get('detected', False)),
                        )
                    )
            if conf_objs:
                AIFieldConfidence.objects.bulk_create(conf_objs)

            execution_ms = int((time.time() - start_time) * 1000)
            job.execution_time_ms = execution_ms
            job.status = AIProcessingStatus.REVIEW_REQUIRED
            job.save(update_fields=['status', 'provider', 'model_name', 'execution_time_ms', 'updated_at'])

            return res, extraction_data

        except Exception as e:
            job.status = AIProcessingStatus.FAILED
            job.error_message = str(e)
            job.save(update_fields=['status', 'error_message', 'updated_at'])
            raise e
