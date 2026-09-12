"""
Duplicate & Similarity Detection Service
Detects exact file duplicates via SHA-256 checksum and fuzzy duplicates via
extracted certificate numbers, faculty name, title, and organizer.
"""
from typing import Dict, Any, List
from django.db.models import Q
from apps.activities.models import Document, Activity


class DuplicateDetectionService:
    @staticmethod
    def detect_duplicates(
        file_hash: str,
        college,
        user,
        extracted_fields: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Runs exact checksum and multi-attribute fuzzy duplicate detection.
        """
        exact_matches = []
        fuzzy_matches = []

        # 1. Exact Checksum Detection across College Documents
        if file_hash:
            doc_matches = Document.objects.filter(
                college=college,
                file_hash=file_hash
            ).select_related('activity', 'uploaded_by')[:5]

            for d in doc_matches:
                exact_matches.append({
                    'type': 'EXACT_CHECKSUM',
                    'document_id': str(d.id),
                    'activity_id': str(d.activity_id),
                    'activity_title': d.activity.title,
                    'uploaded_by': d.uploaded_by.get_full_name() if d.uploaded_by else 'Unknown',
                    'uploaded_at': d.created_at.strftime('%Y-%m-%d %H:%M'),
                    'status': d.activity.status,
                })

        # 2. Similar Activity / Certificate Number Matching
        cert_no = extracted_fields.get('certificate_number', {}).get('value', '').strip()
        title = extracted_fields.get('activity_title', {}).get('value', '').strip()
        organizer = extracted_fields.get('organizer', {}).get('value', '').strip()

        # Check exact certificate number match across the college
        if cert_no and len(cert_no) >= 4:
            cert_matches = Activity.objects.filter(
                college=college,
                certificate_number__iexact=cert_no
            )[:5]

            for a in cert_matches:
                fuzzy_matches.append({
                    'type': 'CERTIFICATE_NUMBER_MATCH',
                    'activity_id': str(a.id),
                    'activity_title': a.title,
                    'certificate_number': a.certificate_number,
                    'faculty_name': a.faculty.get_full_name() if a.faculty else 'Unknown',
                    'status': a.status,
                })

        # Check same faculty with same activity title or organizer
        if user and title and len(title) >= 5:
            user_matches = Activity.objects.filter(
                college=college,
                faculty=user,
                title__icontains=title[:40]
            )[:5]

            for a in user_matches:
                fuzzy_matches.append({
                    'type': 'FACULTY_TITLE_SIMILARITY',
                    'activity_id': str(a.id),
                    'activity_title': a.title,
                    'faculty_name': user.get_full_name(),
                    'created_at': a.created_at.strftime('%Y-%m-%d'),
                    'status': a.status,
                })

        is_exact = len(exact_matches) > 0
        is_possible = len(fuzzy_matches) > 0

        warning_msg = None
        if is_exact:
            warning_msg = f"An identical document file (SHA-256 match) is already registered in the system."
        elif is_possible:
            warning_msg = f"Potential duplicate detected: {len(fuzzy_matches)} existing record(s) share a similar certificate number or title."

        return {
            'is_exact_duplicate': is_exact,
            'is_possible_duplicate': is_possible,
            'has_duplicate_warning': is_exact or is_possible,
            'warning': warning_msg,
            'exact_matches': exact_matches,
            'fuzzy_matches': fuzzy_matches,
        }
