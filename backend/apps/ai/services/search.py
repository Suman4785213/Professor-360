"""
Natural Language Search Service
Translates free-form queries into safe, structured Django ORM filters.
Strictly enforces tenant isolation, role boundaries, and verification status rules.
"""
from typing import Dict, Any, List
from django.db.models import Q
from apps.evidence.models import Evidence
from apps.ai.providers import get_ai_provider


class NaturalLanguageSearchService:
    @staticmethod
    def search_evidence(query: str, user, provider_override: str = None) -> Dict[str, Any]:
        """
        Executes a role-scoped, tenant-isolated natural language search on verified evidence.
        """
        if not user or not user.is_authenticated:
            return {'parsed_query': {}, 'results': [], 'total': 0, 'explanation': 'Authentication required.'}

        provider = get_ai_provider(provider_override)
        parsed = provider.parse_search_query(query, {'user_role': user.role, 'college_id': str(user.college_id)})

        # 1. Base query: Only active verified evidence in user's college
        qs = Evidence.objects.filter(
            status='ACTIVE'
        ).select_related(
            'activity', 'faculty', 'department', 'academic_year', 'document'
        )

        if user.role != 'SUPER_ADMIN':
            qs = qs.filter(college=user.college)

        # 2. Strict Role Permissions Enforced
        if user.role == 'FACULTY':
            qs = qs.filter(faculty=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            if user.department:
                qs = qs.filter(department=user.department)

        # 3. Apply Structured Filters Parsed by AI
        cat_code = parsed.get('category_code')
        if cat_code:
            qs = qs.filter(
                Q(activity__category__code__iexact=cat_code) |
                Q(activity__activity_type__iexact=cat_code)
            )

        dept_code = parsed.get('department_code')
        if dept_code and user.role not in ['FACULTY', 'HOD', 'DEPARTMENT_INCHARGE']:
            qs = qs.filter(
                Q(department__code__iexact=dept_code) |
                Q(department__name__icontains=dept_code)
            )

        ay_name = parsed.get('academic_year_name')
        if ay_name:
            qs = qs.filter(
                Q(academic_year__name__icontains=ay_name) |
                Q(academic_year__code__icontains=ay_name)
            )

        faculty_name = parsed.get('faculty_name')
        if faculty_name and user.role != 'FACULTY':
            qs = qs.filter(
                Q(faculty__first_name__icontains=faculty_name) |
                Q(faculty__last_name__icontains=faculty_name)
            )

        metric_code = parsed.get('metric_code')
        if metric_code:
            qs = qs.filter(mappings__metric__number__icontains=metric_code, mappings__status='ACTIVE')

        keyword = parsed.get('keyword')
        if keyword and len(keyword) >= 2:
            qs = qs.filter(
                Q(activity__title__icontains=keyword) |
                Q(activity__organizer__icontains=keyword) |
                Q(activity__description__icontains=keyword) |
                Q(activity__certificate_number__icontains=keyword) |
                Q(description__icontains=keyword)
            )

        # 4. Format Results
        results = []
        for ev in qs.distinct()[:25]:
            results.append({
                'id': str(ev.id),
                'activity_id': str(ev.activity_id),
                'title': ev.activity.title,
                'faculty_name': ev.faculty.get_full_name() if ev.faculty else 'Unknown',
                'department': ev.department.name if ev.department else '',
                'academic_year': ev.academic_year.name if ev.academic_year else '',
                'category': ev.activity.category.name if ev.activity.category else ev.activity.activity_type,
                'organizer': ev.activity.organizer,
                'start_date': ev.activity.start_date.isoformat() if ev.activity.start_date else None,
                'certificate_number': ev.activity.certificate_number,
                'is_verified': True,
                'has_document': bool(ev.document),
            })

        return {
            'query': query,
            'parsed_filters': parsed,
            'results': results,
            'total': len(results),
            'explanation': f"Found {len(results)} verified evidence records matching your search criteria."
        }
