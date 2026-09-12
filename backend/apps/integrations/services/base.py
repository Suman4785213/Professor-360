"""
Base Provider Interfaces for Integration Layer — Phase 16
Establishes standardized abstractions for Email, Calendar, Storage, and SSO.
Ensures zero hard-coding of vendor-specific details throughout business workflows.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field


@dataclass
class IntegrationResult:
    success: bool
    status_code: int = 200
    message: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    error_code: str = ""


class BaseEmailProvider(ABC):
    """Abstract interface for transactional email delivery."""

    @abstractmethod
    def send_email(
        self,
        recipient: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> IntegrationResult:
        pass


class BaseCalendarProvider(ABC):
    """Abstract interface for external calendar integrations."""

    @abstractmethod
    def create_or_update_event(
        self,
        user_email: str,
        summary: str,
        description: str,
        start_time,
        end_time,
        uid: str,
    ) -> IntegrationResult:
        pass

    @abstractmethod
    def delete_event(self, user_email: str, uid: str) -> IntegrationResult:
        pass


class BaseStorageProvider(ABC):
    """Abstract interface for private document and backup storage."""

    @abstractmethod
    def get_signed_url(self, file_path: str, expiry_seconds: int = 3600) -> str:
        pass

    @abstractmethod
    def upload_file(self, local_path: str, destination_path: str) -> IntegrationResult:
        pass

    @abstractmethod
    def verify_checksum(self, remote_path: str, expected_sha256: str) -> bool:
        pass


class BaseSSOProvider(ABC):
    """Abstract interface for Single Sign-On authenticators."""

    @abstractmethod
    def generate_auth_url(self, college, state: str) -> str:
        pass

    @abstractmethod
    def verify_code_and_get_identity(self, code: str, state: str) -> IntegrationResult:
        pass
