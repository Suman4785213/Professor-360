"""
Base AI Provider Interface
Defines the required abstraction for all AI providers (OpenAI, Anthropic, Custom LLM, Heuristic).
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional


class BaseAIProvider(ABC):
    """
    Abstract interface for document intelligence and natural language processing providers.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the provider (e.g., 'openai', 'heuristic')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Model identifier (e.g., 'gpt-4o-mini', 'rule-based-v1')."""
        pass

    @abstractmethod
    def extract_certificate_fields(self, text: str, filename: str) -> Dict[str, Any]:
        """
        Extracts structured fields from certificate raw text.
        Returns a dictionary formatted with:
        {
            'document_type': str,
            'fields': {
                'activity_title': {'value': str, 'confidence': float},
                'organizer': {'value': str, 'confidence': float},
                'start_date': {'value': str, 'confidence': float},
                'end_date': {'value': str, 'confidence': float},
                'duration': {'value': str, 'confidence': float},
                'faculty_name': {'value': str, 'confidence': float},
                'certificate_number': {'value': str, 'confidence': float},
                'venue': {'value': str, 'confidence': float},
                'description': {'value': str, 'confidence': float},
                ...
            },
            'overall_confidence': float
        }
        """
        pass

    @abstractmethod
    def classify_activity_category(
        self, text: str, available_categories: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Matches extracted text against the college's active category choices.
        Returns:
        {
            'suggested_category_id': Optional[str],
            'suggested_code': str,
            'confidence': float,
            'alternative_categories': List[Dict[str, Any]],
            'explanation': str
        }
        """
        pass

    @abstractmethod
    def parse_search_query(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Translates a natural language search query into structured filter parameters.
        Returns:
        {
            'keyword': Optional[str],
            'category_code': Optional[str],
            'department_code': Optional[str],
            'academic_year_code': Optional[str],
            'faculty_name': Optional[str],
            'metric_code': Optional[str],
            'confidence': float,
            'explanation': str
        }
        """
        pass
