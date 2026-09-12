"""
Production Defaults Seed Management Command (Phase 20)
Usage:
    python manage.py seed_prod_defaults

Seeds strictly minimal, safe initial configuration:
- Global Document Categories
- Global Activity Categories
- Global Standard Report Types

DOES NOT create any demo colleges, fake users, test activities, or synthetic credentials.
Fully idempotent and production-safe.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.activities.models import ActivityCategory, DocumentCategory
from apps.reports.models import ReportType, ReportFormat


class Command(BaseCommand):
    help = "Seeds minimal production-safe default configurations (categories, report types) without fake data."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting minimal production default configuration seed..."))

        with transaction.atomic():
            # 1. Document Categories (Global defaults: college=None)
            doc_categories = [
                ('CERTIFICATE', 'Certificate of Completion / Participation', 'Official completion certificate or certificate of participation.'),
                ('ATTENDANCE', 'Attendance Sheet / Proof', 'Official attendance record, registration sheet, or signed sign-in sheet.'),
                ('REPORT', 'Activity / Event Summary Report', 'Brief descriptive report detailing event objectives, schedule, and outcomes.'),
                ('PHOTO', 'Event Photographs / Proof', 'Geo-tagged or timestamped photographs documenting the event activity.'),
                ('PUBLICATION_PROOF', 'Publication / Paper Proof', 'First page, DOI screenshot, index list or copyright page proof.'),
                ('AWARD_PROOF', 'Award / Recognition Letter', 'Certificate of merit, award citation, or official recognition letter.'),
                ('SUPPORTING', 'General Supporting Document', 'Brochures, sanction letters, invitations, or institutional communications.'),
                ('OTHER', 'Other Official Proof', 'Any other relevant documentary evidence supporting quality metrics.'),
            ]

            doc_created = 0
            for code, name, desc in doc_categories:
                obj, created = DocumentCategory.objects.get_or_create(
                    college=None,
                    code=code,
                    defaults={'name': name, 'description': desc, 'is_active': True}
                )
                if created:
                    doc_created += 1

            self.stdout.write(self.style.SUCCESS(f"Document Categories: {doc_created} created, {len(doc_categories) - doc_created} verified."))

            # 2. Activity Categories (Global defaults: college=None)
            activity_categories = [
                ('FDP', 'Faculty Development Program', 'Workshops, immersion, and orientation programs for faculty upskilling.'),
                ('WORKSHOP', 'Workshop & Hands-on Training', 'Technical workshops, pedagogy sessions, and skill-building labs.'),
                ('SEMINAR', 'National / International Seminar', 'Academic seminars and thematic quality symposia.'),
                ('CONFERENCE', 'Academic Conference', 'Paper presentations in national and international peer-reviewed conferences.'),
                ('CERTIFICATION', 'Professional Certifications', 'NPTEL, Coursera, industry credentials, and certified pedagogical courses.'),
                ('PUBLICATION', 'Research Publications', 'UGC-CARE, Scopus, Web of Science, or peer-reviewed academic journals and book chapters.'),
                ('RESEARCH', 'Research Grants & Projects', 'Funded research projects, consultancy assignments, and seed grants.'),
                ('TRAINING', 'Short Term Training Programs', 'STTP, refresher courses, and executive development training programs.'),
                ('AWARD', 'Awards & Recognitions', 'State, national, and international accolades, fellowship, or honors.'),
                ('OTHER', 'Other Institutional Quality Activities', 'Curricular enrichment, guest lectures, and institutional committee contributions.'),
            ]

            act_created = 0
            for code, name, desc in activity_categories:
                obj, created = ActivityCategory.objects.get_or_create(
                    college=None,
                    code=code,
                    defaults={'name': name, 'description': desc, 'is_active': True}
                )
                if created:
                    act_created += 1

            self.stdout.write(self.style.SUCCESS(f"Activity Categories: {act_created} created, {len(activity_categories) - act_created} verified."))

            # 3. Standard Report Types (Global defaults: college=None)
            report_types = [
                ('FACULTY_SUMMARY', 'Faculty Activities Summary Report', 'Summary compilation of faculty development and research accomplishments.', ReportFormat.PDF),
                ('DEPARTMENT_ANNUAL', 'Department Annual Quality Report', 'Annual performance dossier across teaching, research, and outreach metrics.', ReportFormat.PDF),
                ('EVIDENCE_DOSSIER', 'Verified Digital Evidence Dossier', 'Comprehensive verified evidence registry with document checksums.', ReportFormat.EXCEL),
                ('CRITERIA_COMPLIANCE', 'NAAC / IQAC Criteria Compliance Matrix', 'Criterion-by-criterion evidence alignment status report.', ReportFormat.PDF),
            ]

            rep_created = 0
            for code, name, desc, default_fmt in report_types:
                obj, created = ReportType.objects.get_or_create(
                    college=None,
                    code=code,
                    defaults={'name': name, 'description': desc, 'default_format': default_fmt, 'is_active': True}
                )
                if created:
                    rep_created += 1

            self.stdout.write(self.style.SUCCESS(f"Report Types: {rep_created} created, {len(report_types) - rep_created} verified."))

        self.stdout.write(self.style.SUCCESS("Minimal production defaults seed completed safely with ZERO fake users or demo data."))
