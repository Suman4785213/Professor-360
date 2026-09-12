"""
AI Providers Module & Factory
"""
from django.conf import settings
from .base import BaseAIProvider
from .heuristic_provider import HeuristicAIProvider
from .openai_provider import OpenAIProvider


def get_ai_provider(provider_override: str = None) -> BaseAIProvider:
    """
    Returns the configured AI provider instance.
    Defaults to OpenAI if OPENAI_API_KEY is present, or HeuristicAIProvider.
    """
    selected = provider_override or getattr(settings, 'AI_PROVIDER', 'auto')

    if selected == 'openai':
        return OpenAIProvider()
    elif selected == 'heuristic':
        return HeuristicAIProvider()
    elif selected == 'auto':
        api_key = getattr(settings, 'OPENAI_API_KEY', '')
        if api_key:
            return OpenAIProvider()
        return HeuristicAIProvider()

    return HeuristicAIProvider()
