"""
Core Throttling Classes
Provides rate limiting scopes for authentication, AI services, reports, and public APIs.
"""
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Restricts authentication attempts to prevent brute-force attacks."""
    scope = 'login'


class AIRateThrottle(UserRateThrottle):
    """Limits AI parsing and inference calls per user."""
    scope = 'ai'


class ReportRateThrottle(UserRateThrottle):
    """Limits resource-intensive report and dossier generation."""
    scope = 'reports'


class BurstRateThrottle(UserRateThrottle):
    """Controls rapid bursts of API requests."""
    scope = 'burst'


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = 'password_reset'
    rate = '5/hour'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}
