import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.colleges.models import College
from apps.departments.models import Department
from apps.accounts.models import User, FacultyProfile
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityCategory, Document, ActivityStatus


class Command(BaseCommand):
    help = "Seed rich academic activity records across all 13 categories for Demo Engineering College faculty"

    def handle(self, *args, **options):
        self.stdout.write("Seeding Admin 2 Demo Activities for DEMO-ENG...")

        college = College.objects.filter(code='DEMO-ENG').first()
        if not college:
            college = College.objects.first()

        academic_year = AcademicYear.objects.filter(college=college, is_current=True).first()
        if not academic_year:
            academic_year = AcademicYear.objects.filter(college=college).first()

        departments = Department.objects.filter(college=college)
        categories = {c.code: c for c in ActivityCategory.objects.all()}

        templates = [
            # 1. FDP
            {
                'category_code': 'FDP',
                'activity_type': 'FDP',
                'title': 'AICTE Sponsored FDP on Generative AI & Machine Learning Foundations',
                'organizer': 'Centre for Continuing Education & Research, IIT Madras',
                'duration': '5 Days',
                'duration_days': 5,
                'is_online': False,
                'description': 'Advanced faculty development program covering deep transformer architectures and neural networks.',
            },
            {
                'category_code': 'FDP',
                'activity_type': 'FDP',
                'title': 'National Pedagogical Capacity Building Program on Outcome Based Education (OBE)',
                'organizer': 'National Institute of Technical Teachers Training and Research (NITTTR)',
                'duration': '14 Days',
                'duration_days': 14,
                'is_online': True,
                'description': 'Comprehensive training on Bloom Taxonomy mapping and Course Outcome attainment metrics.',
            },
            # 2. Publication
            {
                'category_code': 'PUBLICATION',
                'activity_type': 'PUBLICATION',
                'title': 'Scalable Decentralized Fault Tolerance for Distributed Edge Intelligence',
                'organizer': 'IEEE Transactions on Cloud Computing & Parallel Systems',
                'venue': 'IEEE Transactions (SCI/Scopus Q1 Indexed)',
                'duration': 'Published',
                'description': 'Peer-reviewed research paper indexed in Scopus and Web of Science with Impact Factor 6.2.',
            },
            {
                'category_code': 'PUBLICATION',
                'activity_type': 'PUBLICATION',
                'title': 'Reinforcement Learning for Optimizing Low-Latency Edge Microservices',
                'organizer': 'Springer Journal of Supercomputing',
                'venue': 'Springer Nature (SCI Indexed)',
                'duration': 'Published',
                'description': 'Research article detailing algorithmic improvements in edge container scheduling.',
            },
            # 3. Certification
            {
                'category_code': 'CERTIFICATION',
                'activity_type': 'CERTIFICATION',
                'title': 'AWS Certified Solutions Architect – Associate (SAA-C03)',
                'organizer': 'Amazon Web Services (AWS)',
                'certificate_number': 'AWS-SAA-849201',
                'duration': 'Valid 3 Years',
                'description': 'Demonstrated advanced expertise in designing resilient high-availability cloud architectures.',
            },
            {
                'category_code': 'CERTIFICATION',
                'activity_type': 'CERTIFICATION',
                'title': 'NPTEL Elite + Gold Certification on Deep Learning for Natural Language Processing',
                'organizer': 'IIT Kharagpur / SWAYAM NPTEL',
                'certificate_number': 'NPTEL24CS91S8301',
                'duration': '12 Weeks Course',
                'description': 'Top 2% score in national faculty certification on deep learning NLP architectures.',
            },
            # 4. Workshop
            {
                'category_code': 'WORKSHOP',
                'activity_type': 'WORKSHOP',
                'title': 'Hands-on Workshop on Kubernetes Orchestration and Microservices Governance',
                'organizer': 'Red Hat Academy & Cloud Innovation Hub',
                'duration': '3 Days',
                'is_online': False,
                'description': 'Practical implementation of CI/CD pipelines, container clustering, and ingress security.',
            },
            # 5. Seminar / Webinar
            {
                'category_code': 'SEMINAR',
                'activity_type': 'SEMINAR',
                'title': 'National Seminar on Quantum Computing Algorithms & Cryptographic Resilience',
                'organizer': 'Computer Society of India (CSI) Regional Chapter',
                'duration': '1 Day',
                'is_online': True,
                'description': 'Expert deliberations on post-quantum cryptographic standards and lattice-based cipher suites.',
            },
            # 6. Conference
            {
                'category_code': 'CONFERENCE',
                'activity_type': 'CONFERENCE',
                'title': 'Adaptive Routing in Resilient Wireless Sensor Mesh Networks',
                'organizer': 'IEEE International Conference on Advanced Networks and Telecommunications Systems (ANTS)',
                'venue': 'New Delhi, India',
                'duration': '3 Days',
                'is_online': False,
                'description': 'Presented oral paper and chaired technical session on wireless sensor routing protocols.',
            },
            # 7. Research
            {
                'category_code': 'RESEARCH',
                'activity_type': 'RESEARCH',
                'title': 'Autonomous Edge Sensor Data Fusion for Smart Water Grid Monitoring',
                'organizer': 'College Research & Innovation Council',
                'duration': '18 Months',
                'description': 'Applied institutional R&D project addressing low-power IoT telemetry in municipal utilities.',
            },
            # 8. Patent
            {
                'category_code': 'PATENT',
                'activity_type': 'ACHIEVEMENT',
                'title': 'An Intelligent Edge-Computing Device for Real-Time Sensor Telemetry Anomalies',
                'organizer': 'Indian Patent Office (IPO)',
                'certificate_number': 'IN-PAT-2024-410982',
                'duration': 'Granted & Published',
                'description': 'Published and examined intellectual property for edge sensor signal noise filtering.',
            },
            # 9. Project
            {
                'category_code': 'PROJECT',
                'activity_type': 'ACHIEVEMENT',
                'title': 'AICTE RPS Funded Project: AI-Driven Cyber Defense Framework for Smart Substation SCADA',
                'organizer': 'All India Council for Technical Education (AICTE RPS)',
                'duration': '2 Years',
                'description': 'Sanctioned grant of ₹14,50,000 for building anomaly detection models for industrial SCADA.',
            },
            # 10. Award / Achievement
            {
                'category_code': 'AWARD',
                'activity_type': 'AWARD',
                'title': 'Distinguished Faculty Researcher of the Year Award 2024',
                'organizer': 'State Council for Science & Technology & Higher Education Directorate',
                'duration': 'Annual 2024',
                'description': 'Recognized for highest citation impact, high-indexed Q1 publications, and funded research grants.',
            },
            # 11. Consultancy
            {
                'category_code': 'CONSULTANCY',
                'activity_type': 'ACHIEVEMENT',
                'title': 'Enterprise Cloud Migration & Data Security Architecture Consultancy',
                'organizer': 'Tech Mahindra Enterprise Solutions & Bosch Labs',
                'duration': '6 Months',
                'description': 'Executed commercial industry advisory project resulting in institutional revenue generation of ₹4,20,000.',
            },
            # 12. Professional Membership
            {
                'category_code': 'MEMBERSHIP',
                'activity_type': 'ACHIEVEMENT',
                'title': 'Senior Life Member — Institute of Electrical and Electronics Engineers (IEEE)',
                'organizer': 'IEEE USA & Region 10',
                'certificate_number': 'IEEE-SM-9382109',
                'duration': 'Life Member',
                'description': 'Senior grade elevation based on 10+ years of professional leadership and academic service.',
            },
            # 13. Other Academic Activities
            {
                'category_code': 'OTHER',
                'activity_type': 'OTHER',
                'title': 'Keynote Speaker: International Expert Lecture Series on Industry 4.0 Transformation',
                'organizer': 'Visvesvaraya Technological University PG Centre',
                'duration': '1 Day',
                'description': 'Invited plenary talk delivered to 250+ postgraduate scholars and faculty on industrial IoT protocols.',
            },
        ]

        created_count = 0
        for dept in departments:
            faculty_members = User.objects.filter(department=dept, role='FACULTY')
            if not faculty_members.exists():
                faculty_members = User.objects.filter(department=dept)

            for faculty in faculty_members:
                # Ensure FacultyProfile exists
                prof, _ = FacultyProfile.objects.get_or_create(
                    user=faculty,
                    defaults={
                        'college': college,
                        'department': dept,
                        'employee_id': faculty.employee_id or f"FAC-{dept.code}-{str(faculty.id)[:4].upper()}",
                        'designation': faculty.designation or 'Associate Professor',
                        'qualification': 'Ph.D. in Engineering',
                        'joining_date': datetime.date(2019, 6, 15),
                        'phone': faculty.phone or '+91 98450 12345',
                        'bio': f"{faculty.get_full_name()} is an academician and research mentor in {dept.name}."
                    }
                )

                for tmpl in templates:
                    cat = categories.get(tmpl['category_code'])
                    exists = Activity.objects.filter(
                        faculty=faculty,
                        category=cat,
                        title=tmpl['title']
                    ).exists()

                    if not exists:
                        act = Activity.objects.create(
                            college=college,
                            department=dept,
                            faculty=faculty,
                            academic_year=academic_year,
                            category=cat,
                            title=tmpl['title'],
                            activity_type=tmpl['activity_type'],
                            organizer=tmpl.get('organizer', ''),
                            venue=tmpl.get('venue', ''),
                            location=dept.name,
                            start_date=datetime.date(2024, 2, 10),
                            end_date=datetime.date(2024, 2, 15),
                            duration=tmpl.get('duration', '3 Days'),
                            duration_days=tmpl.get('duration_days', 3),
                            description=tmpl.get('description', ''),
                            is_online=tmpl.get('is_online', False),
                            certificate_number=tmpl.get('certificate_number', f"VER-{str(dept.code)}-{created_count:04d}"),
                            status=ActivityStatus.IQAC_VERIFIED,
                        )
                        created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} activities across all 11 departments and 13 categories."))
