"""
Single Sign-On (SSO) & External Identity Service — Phase 16
Supports tenant-scoped OIDC, SAML, and OAuth2 identity provider abstractions,
and institution email domain-based tenant discovery.
"""
import logging
from typing import Optional, Dict, Any, Tuple
from urllib.parse import urlencode

from apps.integrations.models import SSOConfiguration, SSOStatus
from apps.colleges.models import College
from .base import BaseSSOProvider, IntegrationResult

logger = logging.getLogger(__name__)


class MockSSOProvider(BaseSSOProvider):
    """
    Mock SSO Provider for automated test suites and local testing.
    """
    def generate_auth_url(self, college, state: str) -> str:
        params = {
            "client_id": "mock-sso-client",
            "redirect_uri": "https://iqac.saas/api/integrations/v1/sso/callback/",
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
        }
        return f"https://sso.mock-idp.com/auth?{urlencode(params)}"

    def verify_code_and_get_identity(self, code: str, state: str) -> IntegrationResult:
        if code == "invalid_code":
            return IntegrationResult(success=False, status_code=400, message="Invalid authorization code")
        return IntegrationResult(
            success=True,
            status_code=200,
            message="Identity verified via MockSSO",
            data={
                "sub": "mock-sub-12345",
                "email": "faculty.sso@ait.edu",
                "first_name": "Suresh",
                "last_name": "SSO",
            }
        )


class OIDCProvider(BaseSSOProvider):
    """
    OpenID Connect (OIDC) Enterprise Provider.
    """
    def generate_auth_url(self, college, state: str) -> str:
        cfg = getattr(college, 'sso_config', None)
        issuer = cfg.issuer_url if cfg and cfg.issuer_url else "https://login.microsoftonline.com/common/v2.0"
        client_id = cfg.client_id if cfg else "iqac-client"

        params = {
            "client_id": client_id,
            "redirect_uri": "https://iqac.saas/api/integrations/v1/sso/callback/",
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
        }
        return f"{issuer}/oauth2/v2.0/authorize?{urlencode(params)}"

    def verify_code_and_get_identity(self, code: str, state: str) -> IntegrationResult:
        return IntegrationResult(success=True, message="OIDC Identity exchange ready")


class SSOService:
    """
    Coordinates tenant-aware SSO identity discovery and authentication.
    """
    _provider_override: Optional[BaseSSOProvider] = None

    @classmethod
    def set_provider_override(cls, provider: Optional[BaseSSOProvider]):
        cls._provider_override = provider

    @classmethod
    def get_provider(cls) -> BaseSSOProvider:
        if cls._provider_override:
            return cls._provider_override
        return MockSSOProvider()

    @classmethod
    def resolve_college_by_domain(cls, email: str) -> Optional[College]:
        """
        Discovers college tenant based on email domain (e.g. user@ait.edu -> Apex Institute).
        Never automatically assigns privileged roles.
        """
        if not email or '@' not in email:
            return None

        domain = email.split('@', 1)[1].lower().strip()
        configs = SSOConfiguration.objects.filter(sso_enabled=True, status=SSOStatus.ACTIVE).select_related('college')

        for cfg in configs:
            if domain in [d.lower().strip() for d in (cfg.allowed_domains or [])]:
                return cfg.college

        return None
