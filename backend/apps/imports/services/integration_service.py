"""
Integration & Webhook Service (Phase 14)
Manages tenant-scoped API key issuance, secure authentication,
and HMAC-SHA256 signed webhook delivery.
"""
import hmac
import hashlib
import json
import secrets
import logging
import requests
from typing import Tuple, Optional, Dict, Any
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password

from apps.imports.models import APIKey, WebhookEndpoint, WebhookDeliveryLog
from core.tasks import BackgroundTaskService

logger = logging.getLogger(__name__)


class APIKeyService:
    """
    Manages generation and authentication of tenant API keys.
    """

    @classmethod
    def generate_api_key(
        cls,
        college,
        name: str,
        scopes: list,
        user=None,
        expires_at=None,
    ) -> Tuple[APIKey, str]:
        """
        Generates an API key. Returns (APIKey instance, raw_secret_token).
        Raw secret token is NEVER stored plaintext and is only visible once.
        """
        random_prefix = secrets.token_hex(4)  # 8 chars
        key_prefix = f"iqac_{random_prefix}"
        secret_part = secrets.token_urlsafe(32)
        full_token = f"{key_prefix}_{secret_part}"

        hashed = make_password(secret_part)

        api_key = APIKey.objects.create(
            college=college,
            name=name,
            key_prefix=key_prefix,
            hashed_secret=hashed,
            scopes=scopes,
            created_by=user,
            expires_at=expires_at,
            is_active=True,
        )

        return api_key, full_token

    @classmethod
    def authenticate_token(cls, full_token: str) -> Optional[Tuple[APIKey, Any]]:
        """
        Verifies a raw API token. Returns (APIKey, College) if valid, else None.
        """
        if not full_token or '_' not in full_token:
            return None

        parts = full_token.split('_', 2)
        if len(parts) < 3:
            return None

        key_prefix = f"{parts[0]}_{parts[1]}"
        secret_part = parts[2]

        api_key = APIKey.objects.filter(key_prefix=key_prefix, is_active=True).select_related('college').first()
        if not api_key:
            return None

        # Check expiration
        if api_key.expires_at and api_key.expires_at < timezone.now():
            return None

        # Verify hash
        if check_password(secret_part, api_key.hashed_secret):
            api_key.last_used_at = timezone.now()
            api_key.save(update_fields=['last_used_at'])
            return api_key, api_key.college

        return None


class WebhookDispatcher:
    """
    Dispatches asynchronous HMAC-SHA256 signed webhooks to college subscribers.
    """

    @classmethod
    def dispatch_event(cls, college, event_name: str, payload: Dict[str, Any]):
        """
        Dispatches event to all active endpoints registered by the college.
        """
        endpoints = WebhookEndpoint.objects.filter(college=college, is_active=True)
        for ep in endpoints:
            if not ep.events or event_name in ep.events:
                BackgroundTaskService.dispatch_async(
                    cls._deliver_webhook,
                    endpoint_id=str(ep.id),
                    event_name=event_name,
                    payload=payload,
                    task_name=f"webhook_{event_name}_{ep.id}",
                )

    @classmethod
    def _deliver_webhook(cls, endpoint_id: str, event_name: str, payload: Dict[str, Any]):
        ep = WebhookEndpoint.objects.filter(id=endpoint_id, is_active=True).first()
        if not ep:
            return

        payload_bytes = json.dumps(payload, default=str).encode('utf-8')
        signature = hmac.new(ep.secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()

        headers = {
            'Content-Type': 'application/json',
            'X-IQAC-Event': event_name,
            'X-IQAC-Signature': signature,
            'User-Agent': 'IQAC-Webhook-Dispatcher/1.0',
        }

        log_entry = WebhookDeliveryLog.objects.create(
            endpoint=ep,
            event=event_name,
            payload=payload,
            status='PENDING',
        )

        try:
            resp = requests.post(ep.url, data=payload_bytes, headers=headers, timeout=5)
            log_entry.response_status = resp.status_code
            if 200 <= resp.status_code < 300:
                log_entry.status = 'DELIVERED'
            else:
                log_entry.status = 'FAILED'
                log_entry.error_message = f"Remote endpoint returned HTTP {resp.status_code}"
        except Exception as exc:
            log_entry.status = 'FAILED'
            log_entry.error_message = str(exc)
            logger.warning(f"Webhook delivery failed for {ep.url}: {exc}")
        finally:
            log_entry.save()
