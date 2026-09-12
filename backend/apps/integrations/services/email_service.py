"""
Email Integration Service & Providers — Phase 16
Handles transactional emails, template interpolation, delivery logging,
and controlled asynchronous retries with strict failure isolation.
"""
import re
import logging
from typing import Dict, Any, Optional
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail

from apps.integrations.models import EmailTemplate, EmailDeliveryLog, EmailDeliveryStatus
from apps.notifications.models import NotificationPreference
from .base import BaseEmailProvider, IntegrationResult

logger = logging.getLogger(__name__)


class MockEmailProvider(BaseEmailProvider):
    """
    Mock Email Provider for automated test suites, staging, and demo environments.
    """
    sent_emails = []
    simulate_failure = False
    failure_error_message = "Mock SMTP connection timeout (simulated)."

    @classmethod
    def reset(cls):
        cls.sent_emails = []
        cls.simulate_failure = False

    def send_email(
        self,
        recipient: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> IntegrationResult:
        if self.simulate_failure:
            return IntegrationResult(
                success=False,
                status_code=500,
                message=self.failure_error_message,
                error_code="MOCK_SMTP_ERROR"
            )

        email_record = {
            "recipient": recipient,
            "subject": subject,
            "body_text": body_text,
            "body_html": body_html,
            "timestamp": timezone.now(),
        }
        self.sent_emails.append(email_record)
        return IntegrationResult(
            success=True,
            status_code=200,
            message="Email successfully dispatched via MockProvider",
            data={"message_id": f"mock-{len(self.sent_emails)}"}
        )


class SMTPEmailProvider(BaseEmailProvider):
    """
    Standard SMTP / Production Email Provider.
    """
    def send_email(
        self,
        recipient: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> IntegrationResult:
        try:
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@iqac.local')
            send_mail(
                subject=subject,
                message=body_text,
                from_email=from_email,
                recipient_list=[recipient],
                html_message=body_html,
                fail_silently=False,
            )
            return IntegrationResult(
                success=True,
                status_code=200,
                message="Dispatched via SMTP",
            )
        except Exception as exc:
            logger.error(f"SMTP email dispatch failed to {recipient}: {exc}")
            return IntegrationResult(
                success=False,
                status_code=500,
                message=str(exc),
                error_code="SMTP_DELIVERY_FAILED"
            )


class EmailService:
    """
    Coordinates email templates, preference checks, dispatches, and retries.
    """
    _provider_override: Optional[BaseEmailProvider] = None

    @classmethod
    def set_provider_override(cls, provider: Optional[BaseEmailProvider]):
        cls._provider_override = provider

    @classmethod
    def get_provider(cls) -> BaseEmailProvider:
        if cls._provider_override:
            return cls._provider_override

        provider_type = getattr(settings, 'EMAIL_PROVIDER_TYPE', 'mock').lower()
        if provider_type == 'smtp':
            return SMTPEmailProvider()
        return MockEmailProvider()

    @classmethod
    def render_template_string(cls, template_str: str, context: Dict[str, Any]) -> str:
        """
        Safely replaces {{variable_name}} placeholders with values from context.
        Completely prevents arbitrary code evaluation.
        """
        def replacer(match):
            key = match.group(1).strip()
            return str(context.get(key, ''))

        return re.sub(r'\{\{\s*([a-zA-Z0-9_]+)\s*\}\}', replacer, template_str or '')

    @classmethod
    def send_templated_email(
        cls,
        college,
        recipient: str,
        event: str,
        context: Dict[str, Any],
        deduplication_key: str = "",
        is_security_critical: bool = False,
    ) -> IntegrationResult:
        """
        Sends a templated email with safe variable interpolation, preference checks,
        and failure isolation. External failures will NEVER break the calling workflow.
        """
        # 1. Message Deduplication Check
        if deduplication_key:
            recent_log = EmailDeliveryLog.objects.filter(
                college=college,
                recipient=recipient,
                deduplication_key=deduplication_key,
                status=EmailDeliveryStatus.SENT,
            ).first()
            if recent_log:
                logger.info(f"Email with deduplication_key='{deduplication_key}' already sent to {recipient}. Skipping.")
                return IntegrationResult(
                    success=True,
                    message="Suppressed duplicate message",
                    data={"suppressed": True}
                )

        # 2. Check User Email Preference (Critical security notices bypass preference)
        if not is_security_critical:
            pref = NotificationPreference.objects.filter(user__email=recipient).first()
            if pref and not pref.email_enabled:
                logger.info(f"User {recipient} has disabled email notifications. Skipping.")
                return IntegrationResult(
                    success=True,
                    message="Skipped: User disabled email notifications",
                    data={"skipped": True}
                )

        # 3. Resolve Template (Tenant-specific template first, then system default)
        tpl = EmailTemplate.objects.filter(college=college, event=event, is_active=True).first()
        if not tpl:
            tpl = EmailTemplate.objects.filter(college__isnull=True, event=event, is_active=True).first()

        subject_raw = tpl.subject if tpl else f"IQAC Notification: {event.replace('_', ' ').title()}"
        body_raw = tpl.body if tpl else "Hello {{faculty_name}},\n\nYou have an update regarding: {{event}}.\n\nThank you,\n{{college_name}} IQAC Team"

        # Default context variables
        enriched_context = {
            "college_name": college.name if college else "College IQAC",
            "college_code": college.code if college else "IQAC",
            "event": event,
            **context,
        }

        subject = cls.render_template_string(subject_raw, enriched_context)
        body = cls.render_template_string(body_raw, enriched_context)

        # 4. Create Audit Log in PENDING Status
        log = EmailDeliveryLog.objects.create(
            college=college,
            recipient=recipient,
            event=event,
            template=tpl,
            subject=subject,
            status=EmailDeliveryStatus.PENDING,
            attempt_count=1,
            max_attempts=3,
            deduplication_key=deduplication_key,
            provider="mock" if isinstance(cls.get_provider(), MockEmailProvider) else "smtp"
        )

        # 5. Non-blocking Dispatch through Provider Abstraction
        try:
            provider = cls.get_provider()
            res = provider.send_email(
                recipient=recipient,
                subject=subject,
                body_text=body,
            )

            if res.success:
                log.status = EmailDeliveryStatus.SENT
                log.provider_response = res.message
                log.save(update_fields=['status', 'provider_response'])
                return res
            else:
                log.status = EmailDeliveryStatus.RETRYING
                log.provider_response = res.message
                log.error_code = res.error_code or "PROVIDER_ERROR"
                log.next_retry_at = timezone.now() + timedelta(minutes=5)
                log.save(update_fields=['status', 'provider_response', 'error_code', 'next_retry_at'])
                logger.warning(f"Email dispatch failed for {recipient}: {res.message}")
                return res

        except Exception as exc:
            log.status = EmailDeliveryStatus.RETRYING
            log.provider_response = str(exc)
            log.error_code = "UNHANDLED_EXCEPTION"
            log.next_retry_at = timezone.now() + timedelta(minutes=5)
            log.save(update_fields=['status', 'provider_response', 'error_code', 'next_retry_at'])
            logger.error(f"Unexpected error in email dispatch: {exc}")
            # NEVER break caller workflow!
            return IntegrationResult(
                success=False,
                status_code=500,
                message=str(exc),
                error_code="UNHANDLED_EXCEPTION"
            )

    @classmethod
    def retry_delivery(cls, log_id: str) -> IntegrationResult:
        """
        Retries a failed or retrying email delivery.
        """
        log = EmailDeliveryLog.objects.filter(id=log_id).select_related('college', 'template').first()
        if not log:
            return IntegrationResult(success=False, status_code=404, message="Log not found.")

        if log.status == EmailDeliveryStatus.SENT:
            return IntegrationResult(success=True, message="Email already delivered successfully.")

        log.attempt_count += 1
        provider = cls.get_provider()

        try:
            res = provider.send_email(
                recipient=log.recipient,
                subject=log.subject or f"IQAC Notification: {log.event}",
                body_text=log.template.body if log.template else "IQAC Notification.",
            )

            if res.success:
                log.status = EmailDeliveryStatus.SENT
                log.provider_response = res.message
                log.next_retry_at = None
            else:
                if log.attempt_count >= log.max_attempts:
                    log.status = EmailDeliveryStatus.FAILED
                    log.next_retry_at = None
                else:
                    log.status = EmailDeliveryStatus.RETRYING
                    log.next_retry_at = timezone.now() + timedelta(minutes=15)
                log.provider_response = res.message
                log.error_code = res.error_code or "RETRY_FAILED"

            log.save()
            return res

        except Exception as exc:
            if log.attempt_count >= log.max_attempts:
                log.status = EmailDeliveryStatus.FAILED
                log.next_retry_at = None
            else:
                log.status = EmailDeliveryStatus.RETRYING
                log.next_retry_at = timezone.now() + timedelta(minutes=15)
            log.provider_response = str(exc)
            log.error_code = "RETRY_EXCEPTION"
            log.save()
            return IntegrationResult(success=False, status_code=500, message=str(exc))
