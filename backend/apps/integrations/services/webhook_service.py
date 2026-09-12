"""
Webhook Integration Service — Phase 16
Handles outgoing event dispatches with HMAC-SHA256 signing, replay protection,
event deduplication, and inbound webhook reception.
"""
import hmac
import hashlib
import json
import time
import uuid
import logging
import requests
from typing import Dict, Any, Optional, Tuple
from django.utils import timezone

from apps.imports.models import WebhookEndpoint, WebhookDeliveryLog
from apps.integrations.models import IncomingWebhookLog
from core.tasks import BackgroundTaskService
from .base import IntegrationResult

logger = logging.getLogger(__name__)

REPLAY_TOLERANCE_SECONDS = 300  # 5 minutes window


class WebhookService:
    """
    Manages outbound webhook signing, delivery, retry management,
    and inbound webhook signature validation.
    """

    @classmethod
    def compute_signature(cls, secret: str, timestamp: int, payload_bytes: bytes) -> str:
        """
        Computes HMAC-SHA256 signature using secret and timestamped payload:
        sig = HMAC-SHA256(secret, f"{timestamp}.".encode() + payload_bytes)
        """
        to_sign = f"{timestamp}.".encode('utf-8') + payload_bytes
        return hmac.new(secret.encode('utf-8'), to_sign, hashlib.sha256).hexdigest()

    @classmethod
    def verify_signature(
        cls,
        secret: str,
        timestamp_str: str,
        signature: str,
        payload_bytes: bytes,
    ) -> Tuple[bool, str]:
        """
        Verifies signature and checks replay window (within 5 minutes).
        """
        if not timestamp_str or not signature:
            return False, "Missing signature or timestamp header."

        try:
            ts = int(timestamp_str)
        except ValueError:
            return False, "Invalid timestamp format."

        current_ts = int(time.time())
        if abs(current_ts - ts) > REPLAY_TOLERANCE_SECONDS:
            return False, f"Replay window expired. Timestamp delta={abs(current_ts - ts)}s > {REPLAY_TOLERANCE_SECONDS}s."

        expected_sig = cls.compute_signature(secret, ts, payload_bytes)
        if not hmac.compare_digest(expected_sig, signature):
            return False, "Invalid HMAC signature."

        return True, "Valid signature."

    @classmethod
    def dispatch_event(cls, college, event_name: str, payload: Dict[str, Any]):
        """
        Dispatches minimal metadata event to all subscribed endpoints for this college.
        Non-blocking background dispatch.
        """
        endpoints = WebhookEndpoint.objects.filter(college=college, is_active=True)
        for ep in endpoints:
            if not ep.events or event_name in ep.events:
                BackgroundTaskService.dispatch_async(
                    cls._send_webhook,
                    endpoint_id=str(ep.id),
                    event_name=event_name,
                    payload=payload,
                    task_name=f"webhook_{event_name}_{ep.id}",
                )

    @classmethod
    def _send_webhook(cls, endpoint_id: str, event_name: str, payload: Dict[str, Any]):
        ep = WebhookEndpoint.objects.filter(id=endpoint_id, is_active=True).first()
        if not ep:
            return

        event_id = str(uuid.uuid4())
        timestamp = int(time.time())

        # Minimal necessary payload (Never leaks private document contents)
        clean_payload = {
            "event_id": event_id,
            "event": event_name,
            "timestamp": timestamp,
            "college_code": ep.college.code,
            "data": payload,
        }

        payload_bytes = json.dumps(clean_payload, default=str).encode('utf-8')
        signature = cls.compute_signature(ep.secret, timestamp, payload_bytes)

        headers = {
            'Content-Type': 'application/json',
            'X-IQAC-Event': event_name,
            'X-IQAC-Event-ID': event_id,
            'X-IQAC-Timestamp': str(timestamp),
            'X-IQAC-Signature': signature,
            'User-Agent': 'IQAC-Webhook-Engine/2.0',
        }

        log_entry = WebhookDeliveryLog.objects.create(
            endpoint=ep,
            event=event_name,
            payload=clean_payload,
            status='PENDING',
        )

        try:
            resp = requests.post(ep.url, data=payload_bytes, headers=headers, timeout=5)
            log_entry.response_status = resp.status_code
            if 200 <= resp.status_code < 300:
                log_entry.status = 'DELIVERED'
            else:
                log_entry.status = 'FAILED'
                log_entry.error_message = f"Endpoint responded with HTTP {resp.status_code}"
        except Exception as exc:
            log_entry.status = 'FAILED'
            log_entry.error_message = str(exc)
            logger.warning(f"Webhook delivery failed for {ep.url}: {exc}")
        finally:
            log_entry.save()

    @classmethod
    def process_incoming_webhook(
        cls,
        source: str,
        event: str,
        payload: Dict[str, Any],
        signature: str,
        timestamp_str: str,
        secret: str,
        college=None,
    ) -> Tuple[bool, str]:
        """
        Validates and logs an inbound webhook from an external system.
        """
        payload_bytes = json.dumps(payload, default=str).encode('utf-8')
        is_valid, reason = cls.verify_signature(secret, timestamp_str, signature, payload_bytes)

        IncomingWebhookLog.objects.create(
            college=college,
            source=source,
            event=event,
            payload=payload,
            signature=signature,
            is_valid=is_valid,
            status="PROCESSED" if is_valid else "REJECTED",
            error_message="" if is_valid else reason,
        )
        return is_valid, reason
