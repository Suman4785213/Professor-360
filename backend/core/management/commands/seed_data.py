"""
Seed command to create comprehensive demonstration data for Phase 2:
- Super Admin
- Primary College: Demo Engineering College (Code: DEMO-ENG)
- Secondary College: Apex Institute of Technology (Code: APEX) — for Tenant Isolation Verification
- 6 Standard Departments: IT, CSE, ECE, EEE, MECH, CIVIL
- Academic Programs for each Department
- Current & Historical Academic Years
- Demo accounts for all 6 roles
- FacultyProfiles with employee ID, qualifications, joining date
- Verification records & audit logs
"""
import datetime
import hashlib
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from apps.colleges.models import College, SubscriptionPlan, AccreditationType
from apps.departments.models import Department
from apps.programs.models import Program, ProgramStatus
from apps.academic_years.models import AcademicYear
from apps.accounts.models import User, UserRole, FacultyProfile, FacultyStatus
from apps.criteria.models import Criterion, Metric
from apps.activities.models import Activity, ActivityType, ActivityStatus, Document, DocumentCategory
from apps.verification.models import VerificationRecord, VerificationLog, VerificationAction
from apps.evidence.models import Evidence
from apps.audit.models import AuditLog
from apps.ai.models import (
    AIProcessingJob, AIProcessingStatus, AIExtractionResult,
    AIFieldConfidence, AIClassificationResult, AICorrectionLog
)


class Command(BaseCommand):
    help = 'Seeds Phase 2 demonstration data with 6 departments, programs, and all roles'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting Phase 2 database seed on PostgreSQL...'))

        # 1. Super Admin
        super_admin, _ = User.objects.get_or_create(
            email='admin@iqac.local',
            defaults={
                'first_name': 'Super',
                'last_name': 'Admin',
                'role': UserRole.SUPER_ADMIN,
                'is_staff': True,
                'is_superuser': True,
                'designation': 'Platform Administrator',
            }
        )
        super_admin.set_password('admin123')
        super_admin.save()
        self.stdout.write(self.style.SUCCESS('Super Admin: admin@iqac.local / admin123'))

        # 2. Primary College (Demo Engineering College)
        college_a, _ = College.objects.get_or_create(
            code='DEMO-ENG',
            defaults={
                'name': 'Demo Engineering College',
                'city': 'Bengaluru',
                'state': 'Karnataka',
                'pincode': '560001',
                'email': 'iqac@demo.edu',
                'website': 'https://demo.edu',
                'accreditation_type': AccreditationType.NAAC,
                'naac_grade': 'A+',
                'established_year': 2005,
                'subscription_plan': SubscriptionPlan.PRO,
                'subscription_expiry': datetime.date(2027, 12, 31),
                'is_active': True,
            }
        )
        self.stdout.write(self.style.SUCCESS(f'Primary Tenant: {college_a.name} ({college_a.code})'))

        # Secondary College (Apex Institute) for Tenant Isolation Testing
        college_b, _ = College.objects.get_or_create(
            code='APEX',
            defaults={
                'name': 'Apex Institute of Technology',
                'city': 'Hyderabad',
                'state': 'Telangana',
                'pincode': '500001',
                'email': 'iqac@apex.edu',
                'website': 'https://apex.edu',
                'accreditation_type': AccreditationType.NAAC,
                'naac_grade': 'A',
                'established_year': 2012,
                'subscription_plan': SubscriptionPlan.BASIC,
                'subscription_expiry': datetime.date(2026, 12, 31),
                'is_active': True,
            }
        )
        self.stdout.write(self.style.SUCCESS(f'Secondary Tenant: {college_b.name} ({college_b.code})'))

        # 3. Academic Years for College A
        ay_current, _ = AcademicYear.objects.get_or_create(
            college=college_a,
            name='2024-25',
            defaults={
                'start_date': datetime.date(2024, 7, 1),
                'end_date': datetime.date(2025, 6, 30),
                'is_active': True,
                'is_current': True,
            }
        )
        ay_prev, _ = AcademicYear.objects.get_or_create(
            college=college_a,
            name='2023-24',
            defaults={
                'start_date': datetime.date(2023, 7, 1),
                'end_date': datetime.date(2024, 6, 30),
                'is_active': True,
                'is_current': False,
            }
        )
        ay_next, _ = AcademicYear.objects.get_or_create(
            college=college_a,
            name='2025-26',
            defaults={
                'start_date': datetime.date(2025, 7, 1),
                'end_date': datetime.date(2026, 6, 30),
                'is_active': True,
                'is_current': False,
            }
        )
        self.stdout.write(self.style.SUCCESS('Academic years created: 2024-25 (Current), 2023-24, 2025-26'))

        # Academic Years for College B
        AcademicYear.objects.get_or_create(
            college=college_b,
            name='2024-25',
            defaults={
                'start_date': datetime.date(2024, 7, 1),
                'end_date': datetime.date(2025, 6, 30),
                'is_active': True,
                'is_current': True,
            }
        )

        # 4. Six Standard Departments for College A
        dept_data = [
            ('IT', 'Information Technology', 'Department of Information Technology'),
            ('CSE', 'Computer Science and Engineering', 'Department of Computer Science and Engineering'),
            ('ECE', 'Electronics and Communication Engineering', 'Department of Electronics and Communication Engineering'),
            ('EEE', 'Electrical and Electronics Engineering', 'Department of Electrical and Electronics Engineering'),
            ('MECH', 'Mechanical Engineering', 'Department of Mechanical Engineering'),
            ('CIVIL', 'Civil Engineering', 'Department of Civil Engineering'),
        ]
        dept_map = {}
        for code, name, desc in dept_data:
            d, _ = Department.objects.get_or_create(
                college=college_a,
                code=code,
                defaults={'name': name, 'description': desc, 'is_active': True}
            )
            dept_map[code] = d
        self.stdout.write(self.style.SUCCESS('6 Standard Departments created (IT, CSE, ECE, EEE, MECH, CIVIL)'))

        # Single department for College B for tenant testing
        dept_b, _ = Department.objects.get_or_create(
            college=college_b,
            code='CSE',
            defaults={'name': 'Computer Science', 'description': 'Apex CSE Dept', 'is_active': True}
        )

        # 5. Academic Programs for each Department
        programs_data = [
            (dept_map['IT'], 'B.Tech Information Technology', 'BTECH-IT', 'B.Tech', 4),
            (dept_map['CSE'], 'B.Tech Computer Science and Engineering', 'BTECH-CSE', 'B.Tech', 4),
            (dept_map['CSE'], 'M.Tech Computer Engineering', 'MTECH-CSE', 'M.Tech', 2),
            (dept_map['ECE'], 'B.Tech Electronics and Communication Engineering', 'BTECH-ECE', 'B.Tech', 4),
            (dept_map['EEE'], 'B.Tech Electrical and Electronics Engineering', 'BTECH-EEE', 'B.Tech', 4),
            (dept_map['MECH'], 'B.Tech Mechanical Engineering', 'BTECH-MECH', 'B.Tech', 4),
            (dept_map['CIVIL'], 'B.Tech Civil Engineering', 'BTECH-CIVIL', 'B.Tech', 4),
        ]
        for dept_obj, p_name, p_code, p_deg, p_dur in programs_data:
            Program.objects.get_or_create(
                college=college_a,
                code=p_code,
                defaults={
                    'department': dept_obj,
                    'name': p_name,
                    'degree': p_deg,
                    'duration_years': p_dur,
                    'status': ProgramStatus.ACTIVE
                }
            )
        self.stdout.write(self.style.SUCCESS('Academic programs created for all departments'))

        # 6. Role-based Users for College A
        # Role 2: College Management
        mgmt_user, _ = User.objects.get_or_create(
            email='management@demo.edu',
            defaults={
                'first_name': 'Rajesh',
                'last_name': 'Patil',
                'college': college_a,
                'role': UserRole.COLLEGE_MANAGEMENT,
                'designation': 'Secretary / Trustee',
            }
        )
        mgmt_user.set_password('demo123')
        mgmt_user.save()

        # Role 3: IQAC Coordinator
        iqac_user, _ = User.objects.get_or_create(
            email='iqac@demo.edu',
            defaults={
                'first_name': 'Dr. Suresh',
                'last_name': 'Sharma',
                'college': college_a,
                'role': UserRole.IQAC,
                'designation': 'Director, Internal Quality Assurance Cell',
            }
        )
        iqac_user.set_password('demo123')
        iqac_user.save()

        # Role 4: HOD (CSE)
        hod_cse, _ = User.objects.get_or_create(
            email='hod.cse@demo.edu',
            defaults={
                'first_name': 'Dr. Anita',
                'last_name': 'Deshmukh',
                'college': college_a,
                'department': dept_map['CSE'],
                'role': UserRole.HOD,
                'designation': 'Professor & Head of Department',
            }
        )
        hod_cse.set_password('demo123')
        hod_cse.save()
        dept_map['CSE'].hod = hod_cse
        dept_map['CSE'].save()

        # Role 5: Department In-charge (CSE)
        incharge_cse, _ = User.objects.get_or_create(
            email='incharge.cse@demo.edu',
            defaults={
                'first_name': 'Prof. Vikram',
                'last_name': 'Joshi',
                'college': college_a,
                'department': dept_map['CSE'],
                'role': UserRole.DEPARTMENT_INCHARGE,
                'designation': 'Assistant Professor & Dept IQAC In-charge',
            }
        )
        incharge_cse.set_password('demo123')
        incharge_cse.save()
        dept_map['CSE'].incharge = incharge_cse
        dept_map['CSE'].save()

        # Role 6: Faculty 1 (CSE)
        faculty_1, _ = User.objects.get_or_create(
            email='faculty.smith@demo.edu',
            defaults={
                'first_name': 'Prof. Rahul',
                'last_name': 'Kulkarni',
                'college': college_a,
                'department': dept_map['CSE'],
                'role': UserRole.FACULTY,
                'designation': 'Assistant Professor',
                'employee_id': 'EMP-CSE-042',
                'phone': '+91 9876543210',
            }
        )
        faculty_1.set_password('demo123')
        faculty_1.save()

        FacultyProfile.objects.update_or_create(
            user=faculty_1,
            defaults={
                'college': college_a,
                'department': dept_map['CSE'],
                'employee_id': 'EMP-CSE-042',
                'designation': 'Assistant Professor',
                'qualification': 'Ph.D. in Computer Science',
                'joining_date': datetime.date(2018, 6, 15),
                'phone': '+91 9876543210',
                'status': FacultyStatus.ACTIVE,
                'bio': 'Specialized in Machine Learning, Federated Learning, and Computer Vision research.',
            }
        )

        # Faculty 2 (IT)
        faculty_2, _ = User.objects.get_or_create(
            email='faculty.doe@demo.edu',
            defaults={
                'first_name': 'Prof. Neha',
                'last_name': 'Verma',
                'college': college_a,
                'department': dept_map['IT'],
                'role': UserRole.FACULTY,
                'designation': 'Assistant Professor',
                'employee_id': 'EMP-IT-019',
                'phone': '+91 9876543211',
            }
        )
        faculty_2.set_password('demo123')
        faculty_2.save()

        FacultyProfile.objects.update_or_create(
            user=faculty_2,
            defaults={
                'college': college_a,
                'department': dept_map['IT'],
                'employee_id': 'EMP-IT-019',
                'designation': 'Assistant Professor',
                'qualification': 'M.Tech in Information Technology',
                'joining_date': datetime.date(2020, 8, 1),
                'phone': '+91 9876543211',
                'status': FacultyStatus.ACTIVE,
                'bio': 'Cloud infrastructure, Distributed Systems, and Microservices architecture instructor.',
            }
        )

        # Faculty in College B (to verify College A faculty cannot see College B faculty)
        faculty_b, _ = User.objects.get_or_create(
            email='faculty@apex.edu',
            defaults={
                'first_name': 'Prof. Arun',
                'last_name': 'Reddy',
                'college': college_b,
                'department': dept_b,
                'role': UserRole.FACULTY,
                'designation': 'Associate Professor',
                'employee_id': 'APEX-FAC-001',
            }
        )
        faculty_b.set_password('demo123')
        faculty_b.save()

        FacultyProfile.objects.update_or_create(
            user=faculty_b,
            defaults={
                'college': college_b,
                'department': dept_b,
                'employee_id': 'APEX-FAC-001',
                'designation': 'Associate Professor',
                'qualification': 'Ph.D in AI',
                'joining_date': datetime.date(2019, 1, 10),
                'status': FacultyStatus.ACTIVE,
            }
        )

        self.stdout.write(self.style.SUCCESS('All 6 role accounts & FacultyProfiles created on PostgreSQL'))

        # 7. Phase 5: Demo IQAC Framework 2026, Criteria & Metrics for College A
        from apps.criteria.models import Framework, Criterion, Metric, EvidenceRequirement, EvidenceMapping
        demo_framework, _ = Framework.objects.get_or_create(
            college=college_a,
            code='DEMO_2026',
            defaults={
                'name': 'Demo IQAC Framework 2026',
                'version': '2026.1',
                'description': 'Standard 7-Criteria Institutional Quality Assurance & Accreditation Framework.',
                'is_active': True
            }
        )

        criteria_data = [
            ("1", "Curricular Aspects", "Curriculum design, academic flexibility, curriculum enrichment", 100, 1),
            ("2", "Teaching-Learning and Evaluation", "Student enrollment, teaching-learning process, teacher profile", 350, 2),
            ("3", "Research, Innovations and Extension", "Promotion of research, resource mobilization, publications, awards", 120, 3),
            ("4", "Infrastructure and Learning Resources", "Physical facilities, library, IT infrastructure, campus maintenance", 100, 4),
            ("5", "Student Support and Progression", "Scholarships, capacity building, student participation, alumni", 130, 5),
            ("6", "Governance, Leadership and Management", "Institutional vision, strategy, faculty empowerment, financial management", 100, 6),
            ("7", "Institutional Values and Best Practices", "Gender equity, environmental consciousness, best practices", 100, 7),
        ]
        crit_map = {}
        for num, title, desc, weight, order in criteria_data:
            crit, _ = Criterion.objects.update_or_create(
                college=college_a,
                number=num,
                defaults={
                    'framework': 'DEMO_2026',
                    'framework_ref': demo_framework,
                    'title': title,
                    'description': desc,
                    'weightage': weight,
                    'display_order': order,
                    'is_active': True
                }
            )
            crit_map[num] = crit

        # Key Detailed Metrics with Target Benchmarks
        metrics_data = [
            # Criterion 1
            (crit_map['1'], '1.1.1', 'Curriculum Delivery & Academic Calendar Documentation', 'Structured academic calendar, teaching plans and course delivery logs.', 20, 5, 1),
            (crit_map['1'], '1.2.1', 'Academic Flexibility & Elective Course Offerings', 'Percentage of programs where syllabus revision & choice-based credit system is adopted.', 30, 5, 2),
            # Criterion 2
            (crit_map['2'], '2.3.1', 'Student-Centric Participatory & Experiential Learning', 'Experiential, problem-solving, and participatory methodologies in classroom delivery.', 30, 5, 1),
            (crit_map['2'], '2.4.2', 'Faculty Pedagogical Training & FDP Participation', 'Faculty participation in orientation, refresher courses, short term FDPs and pedagogical bootcamps.', 50, 10, 2),
            # Criterion 3
            (crit_map['3'], '3.1.1', 'Research Grants & Funded Innovation Projects', 'Grants received from government and non-governmental agencies for research projects.', 30, 5, 1),
            (crit_map['3'], '3.3.2', 'Workshops / Seminars on Research Methodology & IPR', 'Seminars and workshops conducted on Intellectual Property Rights (IPR) and emerging research topics.', 30, 5, 2),
            (crit_map['3'], '3.4.3', 'Research Papers in UGC CARE / Scopus Indexed Journals', 'Peer-reviewed research publications in national and international indexed journals.', 50, 10, 3),
            # Criterion 4
            (crit_map['4'], '4.1.3', 'ICT Facilities & Smart Seminar Halls', 'Percentage of classrooms and seminar halls with ICT-enabled facilities and high-speed internet.', 30, 5, 1),
            # Criterion 5
            (crit_map['5'], '5.1.2', 'Capacity Building & Soft Skills Enhancement', 'Capacity building initiatives including soft skills, technical skills, and language lab training.', 30, 5, 1),
            # Criterion 6
            (crit_map['6'], '6.3.3', 'Professional Development / Administrative Training', 'Annual professional development programs organized for faculty and administrative staff.', 40, 10, 1),
            # Criterion 7
            (crit_map['7'], '7.1.1', 'Gender Equity & Campus Safety Initiatives', 'Measures initiated for gender equity promotion, women safety, and institutional grievance redressing.', 30, 5, 1),
            (crit_map['7'], '7.2.1', 'Institutional Best Practices Successfully Implemented', 'Institutional best practices implemented per NAAC benchmark standards.', 40, 5, 2),
        ]
        metric_map = {}
        for c_obj, m_num, m_title, m_desc, m_weight, m_bench, m_order in metrics_data:
            met, _ = Metric.objects.update_or_create(
                college=college_a,
                criterion=c_obj,
                number=m_num,
                defaults={
                    'title': m_title,
                    'description': m_desc,
                    'weightage': m_weight,
                    'benchmark_count': m_bench,
                    'display_order': m_order,
                    'is_required': True,
                    'is_active': True
                }
            )
            metric_map[m_num] = met

        # Evidence Requirements (Section 15)
        EvidenceRequirement.objects.get_or_create(
            metric=metric_map['2.4.2'],
            name='Faculty FDP Completion Certificates',
            defaults={
                'required_count': 10,
                'description': 'Valid participation/completion certificates from AICTE ATAL, NPTEL, or recognized university FDPs.',
                'is_mandatory': True
            }
        )
        EvidenceRequirement.objects.get_or_create(
            metric=metric_map['3.3.2'],
            name='Workshop Attendance & Activity Reports',
            defaults={
                'required_count': 5,
                'description': 'Workshop attendance register signed by coordinator and post-activity summary report.',
                'is_mandatory': True
            }
        )
        EvidenceRequirement.objects.get_or_create(
            metric=metric_map['3.4.3'],
            name='Publication First Page & DOI Proof',
            defaults={
                'required_count': 10,
                'description': 'Scopus/WoS indexed journal paper reprint or published conference proceedings page.',
                'is_mandatory': True
            }
        )
        self.stdout.write(self.style.SUCCESS('Phase 5 Framework, Criteria, Metrics & Requirements configured'))

        # 7.5 Seed Configurable Activity Categories
        from apps.activities.models import ActivityCategory
        categories_data = [
            ('Faculty Development Program', 'FDP', 'FDPs, pedagogical training, refresher courses, orientation programs'),
            ('Workshop', 'WORKSHOP', 'Hands-on technical workshops, skill enhancement bootcamps'),
            ('Seminar', 'SEMINAR', 'National and international academic seminars'),
            ('Conference', 'CONFERENCE', 'Peer-reviewed conference presentations and proceedings'),
            ('Certification', 'CERTIFICATION', 'Professional certifications (NPTEL, Coursera, AWS, Cisco, etc.)'),
            ('Training', 'TRAINING', 'Corporate & industrial training programs'),
            ('Publication', 'PUBLICATION', 'Scopus / WoS / UGC-CARE indexed journal publications'),
            ('Research', 'RESEARCH', 'Funded research projects, grants, and consultations'),
            ('Patent', 'PATENT', 'Published and granted intellectual property patents'),
            ('Award', 'AWARD', 'State, national, and international academic recognitions'),
            ('Achievement', 'ACHIEVEMENT', 'Key institutional milestones and committee contributions'),
            ('Other', 'OTHER', 'Other approved academic contributions'),
        ]
        cat_map = {}
        for name, code, desc in categories_data:
            cat, _ = ActivityCategory.objects.get_or_create(
                college=None,
                code=code,
                defaults={'name': name, 'description': desc, 'is_active': True}
            )
            cat_map[code] = cat

        # Document categories for Phase 4 (Section 12)
        doc_categories_data = [
            ('Certificate', 'CERTIFICATE', 'Official certificate of completion or presentation'),
            ('Attendance Sheet', 'ATTENDANCE', 'Session attendance or participant register'),
            ('Activity Report', 'REPORT', 'Departmental summary, schedule, or post-activity report'),
            ('Photographs', 'PHOTO', 'Geo-tagged event or workshop photographs'),
            ('Publication Proof', 'PUBLICATION_PROOF', 'First page copy, DOI screenshot, or journal proof'),
            ('Award Evidence', 'AWARD_PROOF', 'Official citation, trophy photo, or award letter'),
            ('Supporting Evidence', 'SUPPORTING', 'Brochure, invitation, or supplementary material'),
            ('Other', 'OTHER', 'Other approved verification evidence'),
        ]
        doc_cat_map = {}
        for name, code, desc in doc_categories_data:
            dc, _ = DocumentCategory.objects.get_or_create(
                college=None,
                code=code,
                defaults={'name': name, 'description': desc, 'is_active': True}
            )
            doc_cat_map[code] = dc
        self.stdout.write(self.style.SUCCESS('Document categories initialized (Certificate, Attendance, Report, etc.)'))

        # 8. Sample Activities & Verification chain
        SAMPLE_PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n"
        pdf_hash = hashlib.sha256(SAMPLE_PDF).hexdigest()

        # 8.1 Pending In-charge
        act_cse, _ = Activity.objects.get_or_create(
            title='5-Day FDP on Artificial Intelligence & Deep Learning',
            faculty=faculty_1,
            defaults={
                'college': college_a,
                'department': dept_map['CSE'],
                'academic_year': ay_current,
                'category': cat_map.get('FDP'),
                'activity_type': ActivityType.FDP,
                'organizer': 'AICTE ATAL Academy & IIT Madras',
                'venue': 'Online',
                'location': 'Chennai, Tamil Nadu',
                'is_online': True,
                'start_date': datetime.date(2024, 9, 2),
                'end_date': datetime.date(2024, 9, 6),
                'duration': '5 Days (30 Hours)',
                'duration_days': 5,
                'certificate_number': 'ATAL/2024/CSE/9912',
                'status': ActivityStatus.PENDING_INCHARGE,
                'description': 'Faculty Development Program on Transformers, Diffusion Models, and LLM applications in education.'
            }
        )
        rec_cse, _ = VerificationRecord.objects.get_or_create(
            activity=act_cse,
            defaults={'college': college_a, 'current_status': ActivityStatus.PENDING_INCHARGE}
        )
        VerificationLog.objects.get_or_create(
            verification_record=rec_cse,
            action=VerificationAction.SUBMITTED,
            defaults={
                'actor': faculty_1,
                'role': faculty_1.role,
                'previous_status': ActivityStatus.DRAFT,
                'new_status': ActivityStatus.PENDING_INCHARGE,
                'comment': 'Submitted for department in-charge verification.'
            }
        )

        # 8.2 Pending HOD (Passed In-charge)
        act_hod, _ = Activity.objects.get_or_create(
            title='Hands-on Cloud Microservices and Kubernetes Workshop',
            faculty=faculty_1,
            defaults={
                'college': college_a,
                'department': dept_map['CSE'],
                'academic_year': ay_current,
                'category': cat_map.get('WORKSHOP'),
                'activity_type': ActivityType.WORKSHOP,
                'organizer': 'AWS Academy & Red Hat',
                'venue': 'Tech Center, Campus',
                'location': 'Bengaluru',
                'is_online': False,
                'start_date': datetime.date(2024, 8, 12),
                'end_date': datetime.date(2024, 8, 14),
                'duration': '3 Days',
                'duration_days': 3,
                'certificate_number': 'AWS-ACAD-2024-887',
                'status': ActivityStatus.PENDING_HOD,
                'description': 'Practical deployment of containerized cloud workloads.'
            }
        )
        rec_hod, _ = VerificationRecord.objects.get_or_create(
            activity=act_hod,
            defaults={
                'college': college_a,
                'current_status': ActivityStatus.PENDING_HOD,
                'incharge_verified_by': incharge_cse,
                'incharge_verified_at': datetime.datetime(2024, 8, 16, 11, 30, tzinfo=datetime.timezone.utc),
                'incharge_comment': 'Certificate validated against AWS Academy credentials registry.',
            }
        )
        VerificationLog.objects.get_or_create(
            verification_record=rec_hod,
            action=VerificationAction.INCHARGE_APPROVED,
            defaults={
                'actor': incharge_cse,
                'role': incharge_cse.role,
                'previous_status': ActivityStatus.PENDING_INCHARGE,
                'new_status': ActivityStatus.PENDING_HOD,
                'comment': 'Certificate validated against AWS Academy credentials registry.'
            }
        )

        # 8.3 Verified Evidence (Passed IQAC)
        act_iqac, _ = Activity.objects.get_or_create(
            title='IEEE International Conference on Smart Information Systems',
            faculty=faculty_1,
            defaults={
                'college': college_a,
                'department': dept_map['CSE'],
                'academic_year': ay_current,
                'category': cat_map.get('CONFERENCE'),
                'activity_type': ActivityType.CONFERENCE,
                'organizer': 'IEEE Computer Society',
                'venue': 'Convention Hall',
                'location': 'Hyderabad',
                'is_online': False,
                'start_date': datetime.date(2024, 7, 20),
                'end_date': datetime.date(2024, 7, 22),
                'duration': '3 Days',
                'duration_days': 3,
                'certificate_number': 'IEEE-CONF-2024-342',
                'status': ActivityStatus.VERIFIED_EVIDENCE,
                'description': 'Presented research paper on Distributed Consensus algorithms.'
            }
        )
        rec_iqac, _ = VerificationRecord.objects.get_or_create(
            activity=act_iqac,
            defaults={
                'college': college_a,
                'current_status': ActivityStatus.VERIFIED_EVIDENCE,
                'incharge_verified_by': incharge_cse,
                'incharge_verified_at': datetime.datetime(2024, 7, 24, 10, 0, tzinfo=datetime.timezone.utc),
                'incharge_comment': 'Verified conference certificate and paper presentation.',
                'hod_approved_by': hod_cse,
                'hod_approved_at': datetime.datetime(2024, 7, 25, 14, 0, tzinfo=datetime.timezone.utc),
                'hod_comment': 'Excellent international research participation.',
                'iqac_verified_by': iqac_user,
                'iqac_verified_at': datetime.datetime(2024, 7, 26, 16, 0, tzinfo=datetime.timezone.utc),
                'iqac_comment': 'Sealed as verified evidence for NAAC Criterion 3 (Research).',
            }
        )
        doc_conf_cert, _ = Document.objects.get_or_create(
            activity=act_iqac,
            file_name='IEEE_Smart_Systems_2024_Certificate.pdf',
            defaults={
                'college': college_a,
                'department': dept_map['CSE'],
                'uploaded_by': faculty_1,
                'original_filename': 'IEEE_Smart_Systems_2024_Certificate.pdf',
                'file_size': len(SAMPLE_PDF),
                'mime_type': 'application/pdf',
                'file_hash': pdf_hash,
                'is_primary': True,
                'category': doc_cat_map['CERTIFICATE'],
                'document_type': 'CERTIFICATE',
                'status': 'ACTIVE',
                'version': 1,
            }
        )
        if not doc_conf_cert.file:
            doc_conf_cert.file.save('IEEE_Smart_Systems_2024_Certificate.pdf', ContentFile(SAMPLE_PDF), save=True)

        doc_conf_att, _ = Document.objects.get_or_create(
            activity=act_iqac,
            file_name='IEEE_Conference_Attendance_Log.pdf',
            defaults={
                'college': college_a,
                'department': dept_map['CSE'],
                'uploaded_by': faculty_1,
                'original_filename': 'IEEE_Conference_Attendance_Log.pdf',
                'file_size': len(SAMPLE_PDF),
                'mime_type': 'application/pdf',
                'file_hash': pdf_hash,
                'is_primary': False,
                'category': doc_cat_map['ATTENDANCE'],
                'document_type': 'SUPPORTING',
                'status': 'ACTIVE',
                'version': 1,
            }
        )
        if not doc_conf_att.file:
            doc_conf_att.file.save('IEEE_Conference_Attendance_Log.pdf', ContentFile(SAMPLE_PDF), save=True)

        Evidence.objects.update_or_create(
            activity=act_iqac,
            defaults={
                'college': college_a,
                'department': dept_map['CSE'],
                'faculty': faculty_1,
                'academic_year': ay_current,
                'document': doc_conf_cert,
                'title': act_iqac.title,
                'description': act_iqac.description,
                'category': 'Conference',
                'is_verified': True,
                'verified_at': datetime.datetime(2024, 7, 26, 16, 0, tzinfo=datetime.timezone.utc),
                'status': 'ACTIVE'
            }
        )

        # 8.3b Verified Evidence in IT (Faculty 2)
        act_it_fdp, _ = Activity.objects.get_or_create(
            title='5-Day FDP on Modern Cloud DevOps & Kubernetes Infrastructure',
            faculty=faculty_2,
            defaults={
                'college': college_a,
                'department': dept_map['IT'],
                'academic_year': ay_current,
                'category': cat_map.get('FDP'),
                'activity_type': ActivityType.FDP,
                'organizer': 'Microsoft Cloud Academy & NIT Trichy',
                'location': 'Tiruchirappalli, Tamil Nadu',
                'start_date': datetime.date(2024, 10, 14),
                'end_date': datetime.date(2024, 10, 18),
                'duration': '5 Days (40 Hours)',
                'duration_days': 5,
                'certificate_number': 'MSFT-NIT-2024-8841',
                'status': ActivityStatus.VERIFIED_EVIDENCE,
                'description': 'Advanced container orchestrations, CI/CD pipelines, and infrastructure as code.'
            }
        )
        doc_it_cert, _ = Document.objects.get_or_create(
            activity=act_it_fdp,
            file_name='Cloud_DevOps_FDP_Certificate_2024.pdf',
            defaults={
                'college': college_a,
                'department': dept_map['IT'],
                'uploaded_by': faculty_2,
                'original_filename': 'Cloud_DevOps_FDP_Certificate_2024.pdf',
                'file_size': len(SAMPLE_PDF),
                'mime_type': 'application/pdf',
                'file_hash': pdf_hash,
                'is_primary': True,
                'category': doc_cat_map['CERTIFICATE'],
                'document_type': 'CERTIFICATE',
                'status': 'ACTIVE',
                'version': 1,
            }
        )
        if not doc_it_cert.file:
            doc_it_cert.file.save('Cloud_DevOps_FDP_Certificate_2024.pdf', ContentFile(SAMPLE_PDF), save=True)

        Evidence.objects.update_or_create(
            activity=act_it_fdp,
            defaults={
                'college': college_a,
                'department': dept_map['IT'],
                'faculty': faculty_2,
                'academic_year': ay_current,
                'document': doc_it_cert,
                'title': act_it_fdp.title,
                'description': act_it_fdp.description,
                'category': 'Faculty Development Program',
                'is_verified': True,
                'verified_at': datetime.datetime(2024, 10, 20, 14, 0, tzinfo=datetime.timezone.utc),
                'status': 'ACTIVE'
            }
        )

        # 8.3c Verified Evidence in ECE
        act_ece_ws, _ = Activity.objects.get_or_create(
            title='National Hands-on Workshop on Embedded IoT & Edge Sensors',
            faculty=faculty_1,
            defaults={
                'college': college_a,
                'department': dept_map['ECE'],
                'academic_year': ay_prev,
                'category': cat_map.get('WORKSHOP'),
                'activity_type': ActivityType.WORKSHOP,
                'organizer': 'Texas Instruments & IEEE Sensors Council',
                'location': 'Bengaluru',
                'start_date': datetime.date(2023, 11, 10),
                'end_date': datetime.date(2023, 11, 12),
                'duration': '3 Days',
                'duration_days': 3,
                'certificate_number': 'TI-IEEE-2023-5591',
                'status': ActivityStatus.VERIFIED_EVIDENCE,
                'description': 'Hardware interfacing with TI CC3200 microcontrollers.'
            }
        )
        doc_ece_cert, _ = Document.objects.get_or_create(
            activity=act_ece_ws,
            file_name='TI_Embedded_IoT_Certificate_2023.pdf',
            defaults={
                'college': college_a,
                'department': dept_map['ECE'],
                'uploaded_by': faculty_1,
                'original_filename': 'TI_Embedded_IoT_Certificate_2023.pdf',
                'file_size': len(SAMPLE_PDF),
                'mime_type': 'application/pdf',
                'file_hash': pdf_hash,
                'is_primary': True,
                'category': doc_cat_map['CERTIFICATE'],
                'document_type': 'CERTIFICATE',
                'status': 'ACTIVE',
                'version': 1,
            }
        )
        if not doc_ece_cert.file:
            doc_ece_cert.file.save('TI_Embedded_IoT_Certificate_2023.pdf', ContentFile(SAMPLE_PDF), save=True)

        Evidence.objects.update_or_create(
            activity=act_ece_ws,
            defaults={
                'college': college_a,
                'department': dept_map['ECE'],
                'faculty': faculty_1,
                'academic_year': ay_prev,
                'document': doc_ece_cert,
                'title': act_ece_ws.title,
                'description': act_ece_ws.description,
                'category': 'Workshop',
                'is_verified': True,
                'verified_at': datetime.datetime(2023, 11, 15, 11, 0, tzinfo=datetime.timezone.utc),
                'status': 'ACTIVE'
            }
        )

        # 8.3d Archived Evidence Record (Section 34 Archive Foundation)
        act_archived, _ = Activity.objects.get_or_create(
            title='Legacy Symposium on Telecommunication Network Protocols 2022',
            faculty=faculty_1,
            defaults={
                'college': college_a,
                'department': dept_map['ECE'],
                'academic_year': ay_prev,
                'category': cat_map.get('SEMINAR'),
                'activity_type': ActivityType.SEMINAR,
                'organizer': 'Telecom Regulatory Authority',
                'location': 'New Delhi',
                'start_date': datetime.date(2022, 5, 12),
                'end_date': datetime.date(2022, 5, 13),
                'duration': '2 Days',
                'duration_days': 2,
                'status': ActivityStatus.VERIFIED_EVIDENCE,
                'description': 'Historical standard documentation replaced by 5G standards.'
            }
        )
        Evidence.objects.update_or_create(
            activity=act_archived,
            defaults={
                'college': college_a,
                'department': dept_map['ECE'],
                'faculty': faculty_1,
                'academic_year': ay_prev,
                'title': act_archived.title,
                'description': act_archived.description,
                'category': 'Seminar',
                'is_verified': True,
                'verified_at': datetime.datetime(2022, 5, 20, 10, 0, tzinfo=datetime.timezone.utc),
                'status': 'ARCHIVED',
                'archived_at': datetime.datetime(2024, 1, 15, 12, 0, tzinfo=datetime.timezone.utc),
                'archived_by': iqac_user,
                'archive_reason': 'Superseded by modern 5G standards.'
            }
        )

        # 8.4 Returned to Faculty for correction
        act_ret, _ = Activity.objects.get_or_create(
            title='National Seminar on Quantum Computing Frameworks',
            faculty=faculty_1,
            defaults={
                'college': college_a,
                'department': dept_map['CSE'],
                'academic_year': ay_current,
                'category': cat_map.get('SEMINAR'),
                'activity_type': ActivityType.SEMINAR,
                'organizer': 'Indian Institute of Science',
                'venue': 'Faculty Hall',
                'location': 'Bengaluru',
                'is_online': False,
                'start_date': datetime.date(2024, 8, 28),
                'end_date': datetime.date(2024, 8, 29),
                'duration': '2 Days',
                'duration_days': 2,
                'certificate_number': 'IISC-QS-2024-11',
                'status': ActivityStatus.RETURNED_TO_FACULTY,
                'last_rejection_reason': 'Certificate date does not match submitted activity date. Please re-upload.',
                'last_rejected_by_role': 'DEPARTMENT_INCHARGE',
                'last_rejected_at': datetime.datetime(2024, 8, 30, 9, 30, tzinfo=datetime.timezone.utc),
                'description': 'Seminar covering Qiskit and quantum circuits.'
            }
        )
        rec_ret, _ = VerificationRecord.objects.get_or_create(
            activity=act_ret,
            defaults={
                'college': college_a,
                'current_status': ActivityStatus.RETURNED_TO_FACULTY,
                'incharge_comment': 'Certificate date does not match submitted activity date. Please re-upload.',
            }
        )
        VerificationLog.objects.get_or_create(
            verification_record=rec_ret,
            action=VerificationAction.INCHARGE_REJECTED,
            defaults={
                'actor': incharge_cse,
                'role': incharge_cse.role,
                'previous_status': ActivityStatus.PENDING_INCHARGE,
                'new_status': ActivityStatus.RETURNED_TO_FACULTY,
                'comment': 'Certificate date does not match submitted activity date. Please re-upload.'
            }
        )

        # 8.5 Phase 5: Initial Official Evidence Mappings (Section 37)
        ev_conf = Evidence.objects.filter(activity=act_iqac).first()
        ev_it_fdp = Evidence.objects.filter(activity=act_it_fdp).first()
        ev_ece_ws = Evidence.objects.filter(activity=act_ece_ws).first()

        if ev_conf and '3.4.3' in metric_map:
            EvidenceMapping.objects.get_or_create(
                metric=metric_map['3.4.3'],
                evidence=ev_conf,
                defaults={
                    'college': college_a,
                    'criterion': crit_map['3'],
                    'academic_year': ev_conf.academic_year,
                    'mapped_by': iqac_user,
                    'notes': 'Official mapping: IEEE Smart Systems 2024 conference publication.',
                    'status': 'ACTIVE'
                }
            )

        if ev_it_fdp:
            if '2.4.2' in metric_map:
                EvidenceMapping.objects.get_or_create(
                    metric=metric_map['2.4.2'],
                    evidence=ev_it_fdp,
                    defaults={
                        'college': college_a,
                        'criterion': crit_map['2'],
                        'academic_year': ev_it_fdp.academic_year,
                        'mapped_by': iqac_user,
                        'notes': 'Cloud DevOps FDP mapped to Pedagogical & Technical Training.',
                        'status': 'ACTIVE'
                    }
                )
            if '6.3.3' in metric_map:
                # Multiple mappings support without document duplication (Section 9)
                EvidenceMapping.objects.get_or_create(
                    metric=metric_map['6.3.3'],
                    evidence=ev_it_fdp,
                    defaults={
                        'college': college_a,
                        'criterion': crit_map['6'],
                        'academic_year': ev_it_fdp.academic_year,
                        'mapped_by': iqac_user,
                        'notes': 'Cloud DevOps FDP also supporting Professional Development benchmark.',
                        'status': 'ACTIVE'
                    }
                )

        if ev_ece_ws and '3.3.2' in metric_map:
            EvidenceMapping.objects.get_or_create(
                metric=metric_map['3.3.2'],
                evidence=ev_ece_ws,
                defaults={
                    'college': college_a,
                    'criterion': crit_map['3'],
                    'academic_year': ev_ece_ws.academic_year,
                    'mapped_by': iqac_user,
                    'notes': 'National Workshop on Embedded IoT mapped to Research Methodology & Emerging Tech.',
                    'status': 'ACTIVE'
                }
            )
        self.stdout.write(self.style.SUCCESS('Initial Evidence Mappings seeded'))

        # 8. Phase 6: Report Types, Templates, and Demo Reports (Section 40)
        from apps.reports.models import ReportType, ReportTemplate, ReportFormat, GeneratedReport
        from apps.reports.services import ReportGenerationCoordinator

        report_types_def = [
            ("FACULTY_ACTIVITY", "Faculty Activity Report", "Comprehensive record of faculty activities across teaching, research, and outreach.", "PDF", ""),
            ("FDP", "Faculty Development Program (FDP) Report", "Faculty participation in AICTE, ATAL, and university-recognized FDP programs.", "PDF", "FDP"),
            ("WORKSHOP", "Workshop Participation Report", "Skill development and hands-on technical workshops attended by faculty.", "PDF", "WORKSHOP"),
            ("SEMINAR", "Seminar & Symposium Report", "Academic seminars, symposiums, and guest lecture deliveries.", "PDF", "SEMINAR"),
            ("CONFERENCE", "Conference Proceedings Report", "National and international conference presentations and session chairs.", "PDF", "CONFERENCE"),
            ("CERTIFICATION", "Professional Certification Report", "NPTEL, Coursera, AWS, Google, and industry professional certifications.", "PDF", "CERTIFICATION"),
            ("PUBLICATION", "Research Publication Report", "Journal papers indexed in Scopus, Web of Science, and UGC Care.", "EXCEL", "PUBLICATION"),
            ("RESEARCH", "Research Projects & Grants Report", "Sponsored R&D projects, consultancy, and innovation grants.", "EXCEL", "RESEARCH"),
            ("DEPARTMENT_ACTIVITY", "Department Activity Summary", "Consolidated department-wide academic achievements and milestones.", "PDF", ""),
            ("ACADEMIC_YEAR_SUMMARY", "Academic Year Quality Summary", "Institutional annual quality summary across all departments.", "PDF", ""),
            ("EVIDENCE_LIST", "Evidence Repository Dossier Report", "Verified cryptographic evidence records with verification timestamps.", "EXCEL", ""),
            ("CRITERIA_EVIDENCE", "Criteria-wise Evidence Dossier", "Accreditation evidence grouped by NAAC criteria pillars 1 through 7.", "PDF", ""),
            ("METRIC_EVIDENCE", "Metric Quality Indicator Report", "Detailed proof list mapped to a specific metric indicator.", "WORD", ""),
        ]

        report_type_map = {}
        for idx, (code, name, desc, def_fmt, cat_code) in enumerate(report_types_def, 1):
            rt, _ = ReportType.objects.get_or_create(
                code=code,
                college=college_a,
                defaults={
                    'name': name,
                    'description': desc,
                    'default_format': def_fmt,
                    'category_code': cat_code,
                    'display_order': idx,
                    'is_active': True,
                }
            )
            report_type_map[code] = rt

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(report_type_map)} Report Types'))

        # Seed Default Templates for College A
        tpl_pdf, _ = ReportTemplate.objects.get_or_create(
            college=college_a,
            report_type=report_type_map["FDP"],
            name="Apex Standard FDP PDF Template",
            defaults={
                'file_format': ReportFormat.PDF,
                'version': 1,
                'is_active': True,
                'created_by': iqac_user,
            }
        )
        tpl_excel, _ = ReportTemplate.objects.get_or_create(
            college=college_a,
            report_type=report_type_map["FACULTY_ACTIVITY"],
            name="Institutional Excel Quality Audit Sheet",
            defaults={
                'file_format': ReportFormat.EXCEL,
                'version': 1,
                'is_active': True,
                'created_by': iqac_user,
            }
        )
        tpl_word, _ = ReportTemplate.objects.get_or_create(
            college=college_a,
            report_type=report_type_map["METRIC_EVIDENCE"],
            name="NAAC Executive Dossier Word Template",
            defaults={
                'file_format': ReportFormat.WORD,
                'version': 1,
                'is_active': True,
                'created_by': iqac_user,
            }
        )
        self.stdout.write(self.style.SUCCESS('Seeded Report Templates (PDF, Excel, Word)'))

        # Pre-generate Sample Reports (Section 40)
        try:
            # 1. Sample FDP Report (PDF)
            ReportGenerationCoordinator.generate_report(
                user=iqac_user,
                report_type=report_type_map["FDP"],
                filters={
                    'academic_year': str(ay_current.id),
                    'department': str(dept_map['IT'].id),
                },
                output_format=ReportFormat.PDF,
                template=tpl_pdf
            )
            # 2. Sample Department Excel Report
            ReportGenerationCoordinator.generate_report(
                user=iqac_user,
                report_type=report_type_map["FACULTY_ACTIVITY"],
                filters={
                    'academic_year': str(ay_current.id),
                    'department': str(dept_map['CSE'].id),
                },
                output_format=ReportFormat.EXCEL,
                template=tpl_excel
            )
            # 3. Sample Word Report
            ReportGenerationCoordinator.generate_report(
                user=iqac_user,
                report_type=report_type_map["METRIC_EVIDENCE"],
                filters={
                    'academic_year': str(ay_current.id),
                },
                output_format=ReportFormat.WORD,
                template=tpl_word
            )
            self.stdout.write(self.style.SUCCESS('Pre-generated 3 Demo Reports (PDF, Excel, Word)'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Notice: Sample report generation skipped or noted: {e}'))

        # Seed Phase 7 AI Processing Jobs & Extraction Data
        try:
            job_fdp, _ = AIProcessingJob.objects.get_or_create(
                college=college_a,
                user=faculty_1,
                file_name="AI_Pedagogy_ATAL_FDP_Certificate.pdf",
                defaults={
                    'file_size': 204800,
                    'mime_type': 'application/pdf',
                    'file_hash': hashlib.sha256(b"AI_Pedagogy_ATAL_FDP_Certificate.pdf").hexdigest(),
                    'status': AIProcessingStatus.REVIEW_REQUIRED,
                    'provider': 'heuristic',
                    'model_name': 'iqac-heuristic-nlp-v1',
                    'execution_time_ms': 420,
                }
            )
            AIExtractionResult.objects.get_or_create(
                job=job_fdp,
                defaults={
                    'ai_document_type': 'COMPLETION',
                    'raw_text': 'AICTE Training and Learning (ATAL) Academy Online FDP on Artificial Intelligence & Deep Learning in Education. Awarded to Dr. Jane Doe.',
                    'extracted_data': {
                        'activity_title': {'value': 'AICTE ATAL FDP on Artificial Intelligence & Deep Learning', 'confidence': 0.94, 'detected': True},
                        'organizer': {'value': 'AICTE Training and Learning Academy', 'confidence': 0.91, 'detected': True},
                        'duration': {'value': '5 Days', 'confidence': 0.92, 'detected': True},
                        'certificate_number': {'value': 'ATAL-2025-AI-9021', 'confidence': 0.96, 'detected': True},
                        'faculty_name': {'value': 'Dr. Jane Doe', 'confidence': 0.89, 'detected': True},
                        'start_date': {'value': '2025-07-14', 'confidence': 0.90, 'detected': True},
                        'end_date': {'value': '2025-07-18', 'confidence': 0.90, 'detected': True},
                    },
                    'overall_confidence': 0.92,
                }
            )
            cat_fdp = ActivityCategory.objects.filter(code='FDP').first()
            if cat_fdp:
                AIClassificationResult.objects.get_or_create(
                    job=job_fdp,
                    defaults={
                        'suggested_category': cat_fdp,
                        'suggested_code': 'FDP',
                        'confidence': 0.94,
                        'alternative_categories': [{'code': 'WORKSHOP', 'name': 'Workshop', 'confidence': 0.65}],
                        'explanation': 'Classified based on "Faculty Development Programme" and "ATAL" keywords.',
                    }
                )
            self.stdout.write(self.style.SUCCESS('Seeded Phase 7 AI Processing Sample Jobs'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Notice: AI sample seeding note: {e}'))

        # Seed Phase 8 AQAR / SSR Compliance Workspace Data
        try:
            from django.utils import timezone
            from apps.criteria.models import Section, MetricDataRequirement, DataRequirementType, CalculationSourceType
            from apps.aqar.models import (
                ComplianceNarrative, ComplianceNarrativeStatus, ComplianceWorkspaceType,
                DataRequest, DataRequestStatus, DataRequestPriority,
                PreparationChecklistItem, TaskPriority, TaskStatus
            )

            # 1. Framework Sections
            sec_a, _ = Section.objects.get_or_create(
                framework_ref=demo_framework,
                code='PART_A',
                defaults={
                    'college': college_a,
                    'name': 'Part A: Institutional Data & Academic Profile',
                    'description': 'Basic institutional information, academic programs, and enrollment statistics.',
                    'display_order': 1,
                    'is_active': True,
                }
            )
            sec_b, _ = Section.objects.get_or_create(
                framework_ref=demo_framework,
                code='PART_B',
                defaults={
                    'college': college_a,
                    'name': 'Part B: Seven Assessment Criteria',
                    'description': 'Accreditation criteria evaluation benchmarks and qualitative indicators.',
                    'display_order': 2,
                    'is_active': True,
                }
            )
            # Link criteria 1-7 to Part B
            for crit in crit_map.values():
                if not crit.section:
                    crit.section = sec_b
                    crit.save(update_fields=['section'])

            # 2. Metric Data Requirements
            if '2.4.2' in metric_map:
                MetricDataRequirement.objects.get_or_create(
                    metric=metric_map['2.4.2'],
                    field_name='Total FDP Certificates',
                    defaults={
                        'data_type': DataRequirementType.COUNT,
                        'calculation_source': CalculationSourceType.AUTO_VERIFIED_ACTIVITIES,
                        'activity_category_code': 'FDP',
                        'benchmark_value': '15',
                        'description': 'Target count of verified faculty development program certificates',
                    }
                )
            if '3.4.3' in metric_map:
                MetricDataRequirement.objects.get_or_create(
                    metric=metric_map['3.4.3'],
                    field_name='Total Research Papers in UGC Care',
                    defaults={
                        'data_type': DataRequirementType.COUNT,
                        'calculation_source': CalculationSourceType.AUTO_VERIFIED_ACTIVITIES,
                        'activity_category_code': 'PUBLICATION',
                        'benchmark_value': '20',
                        'description': 'Total verified journal papers indexed in Scopus/WoS/UGC Care',
                    }
                )

            # 3. Preparation Checklist Items (Standard 10-step institutional checklist)
            checklist_titles = [
                ("1. Review & update active Academic Year faculty roster", "Ensure all newly joined and active faculty profiles are verified.", incharge_cse, dept_map['CSE']),
                ("2. Department activities submission & initial verification", "Faculty submit all certificates for completed academic terms.", incharge_cse, dept_map['CSE']),
                ("3. HOD departmental verification clearance", "HOD reviews and approves forwarded departmental dossiers.", hod_cse, dept_map['CSE']),
                ("4. IQAC central evidence authentication & cryptographic hash lock", "IQAC performs final evidence verification.", iqac_user, None),
                ("5. Evidence Repository mapping to Criteria & Metrics", "Map verified evidence records to active accreditation indicators.", iqac_user, None),
                ("6. Structured Metric Data gap analysis inspection", "Identify missing documents and compute availability percentages.", iqac_user, None),
                ("7. Issue departmental Data Requests for missing documentation", "Send target requests to departments for lagging metrics.", iqac_user, None),
                ("8. Draft qualitative narrative responses (AI-assisted with source citations)", "Generate draft narratives grounded strictly in verified data.", iqac_user, None),
                ("9. Official IQAC review and approval of narratives", "IQAC committee verifies narratives and changes status to Approved.", iqac_user, None),
                ("10. Automated AQAR & SSR Dossier Report generation", "Generate official PDF/Excel/Word preparation reports.", iqac_user, None),
            ]
            for order, (title, desc, owner_user, dept) in enumerate(checklist_titles, 1):
                status_val = TaskStatus.COMPLETED if order <= 5 else TaskStatus.IN_PROGRESS if order <= 7 else TaskStatus.PENDING
                PreparationChecklistItem.objects.get_or_create(
                    college=college_a,
                    workspace_type=ComplianceWorkspaceType.AQAR,
                    academic_year=ay_current,
                    title=title,
                    defaults={
                        'description': desc,
                        'owner': owner_user,
                        'department': dept,
                        'priority': TaskPriority.HIGH if order <= 3 else TaskPriority.MEDIUM,
                        'status': status_val,
                        'is_system_item': True,
                        'display_order': order,
                        'completed_at': timezone.now() if status_val == TaskStatus.COMPLETED else None,
                        'completed_by': iqac_user if status_val == TaskStatus.COMPLETED else None,
                    }
                )

            # 4. Sample Data Request
            if '2.4.2' in metric_map:
                DataRequest.objects.get_or_create(
                    college=college_a,
                    metric=metric_map['2.4.2'],
                    academic_year=ay_current,
                    title='Request for 5 Additional Pedagogical FDP Certificates',
                    defaults={
                        'workspace_type': ComplianceWorkspaceType.AQAR,
                        'department': dept_map['CSE'],
                        'assigned_to': incharge_cse,
                        'requested_by': iqac_user,
                        'description': 'Metric 2.4.2 benchmark requires 15 verified FDP certificates. Current verified count is 10. Please submit 5 missing certificates from CSE faculty.',
                        'due_date': datetime.date(2025, 11, 30),
                        'priority': DataRequestPriority.HIGH,
                        'status': DataRequestStatus.OPEN,
                    }
                )

            # 5. Sample Compliance Narrative
            if '3.4.3' in metric_map:
                narr, _ = ComplianceNarrative.objects.get_or_create(
                    college=college_a,
                    workspace_type=ComplianceWorkspaceType.AQAR,
                    academic_year=ay_current,
                    metric=metric_map['3.4.3'],
                    defaults={
                        'narrative_text': (
                            "The institution actively fosters a culture of research and scholarly publication. "
                            "During the academic year, verified research proceedings and peer-reviewed journal papers "
                            "were published across engineering and science departments. Verified faculty papers indexed in "
                            "IEEE and Scopus are securely cataloged in the institutional repository."
                        ),
                        'status': ComplianceNarrativeStatus.READY_FOR_REVIEW,
                        'author': iqac_user,
                        'is_ai_drafted': True,
                        'ai_model': 'HEURISTIC_ASSISTED',
                        'version': 1,
                    }
                )
                if ev_conf:
                    narr.source_evidence.add(ev_conf)

            # 6. Additional Phase 8 Report Types
            ReportType.objects.get_or_create(
                code='AQAR_PREPARATION',
                college=college_a,
                defaults={
                    'name': 'Annual Quality Assurance Report (AQAR) Preparation Dossier',
                    'description': 'Comprehensive annual institutional quality report with metrics, data, and evidence links.',
                    'default_format': ReportFormat.PDF,
                    'display_order': 14,
                    'is_active': True,
                }
            )
            ReportType.objects.get_or_create(
                code='SSR_PREPARATION',
                college=college_a,
                defaults={
                    'name': 'Self Study Report (SSR) Institutional Readiness Report',
                    'description': 'Accreditation cycle multi-year readiness dossier with criteria progress and narratives.',
                    'default_format': ReportFormat.PDF,
                    'display_order': 15,
                    'is_active': True,
                }
            )

            self.stdout.write(self.style.SUCCESS('Seeded Phase 8 AQAR / SSR Compliance Workspace Data'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Notice: Phase 8 seed error: {e}'))

        # 7. Phase 9: Advanced Analytics & Executive Intelligence Seeding
        try:
            from apps.analytics.models import (
                ExecutiveSnapshot, AIExecutiveInsight, InsightCategory,
                InsightSeverity, ScheduledAnalyticsConfig
            )
            # Create Executive Snapshots for Current and Previous AY
            ExecutiveSnapshot.objects.get_or_create(
                college=college_a,
                academic_year=ay_current,
                snapshot_date=datetime.date.today(),
                defaults={
                    'total_faculty': 6,
                    'total_activities': 12,
                    'verified_evidence_count': 5,
                    'pending_verification_count': 3,
                    'aqar_completeness_pct': 71.4,
                    'ssr_completeness_pct': 62.5,
                    'data_quality_score': 94.2,
                    'bottleneck_count': 1,
                    'metadata': {'seed_source': 'phase9_initial'},
                }
            )
            ExecutiveSnapshot.objects.get_or_create(
                college=college_a,
                academic_year=ay_prev,
                snapshot_date=datetime.date(2024, 6, 30),
                defaults={
                    'total_faculty': 5,
                    'total_activities': 8,
                    'verified_evidence_count': 4,
                    'pending_verification_count': 0,
                    'aqar_completeness_pct': 58.0,
                    'ssr_completeness_pct': 45.0,
                    'data_quality_score': 88.0,
                    'bottleneck_count': 0,
                    'metadata': {'seed_source': 'phase9_historical'},
                }
            )

            # Grounded AI Executive Insights
            AIExecutiveInsight.objects.get_or_create(
                college=college_a,
                title="Year-over-Year Verified Evidence Growth (+25%)",
                category=InsightCategory.GROWTH,
                defaults={
                    'academic_year': ay_current,
                    'severity': InsightSeverity.INFO,
                    'narrative': "Institutional evidence acquisition has grown by 25.0% compared to AY 2023-24 (4 to 5 verified records). Computer Science & Engineering leads with highest contribution.",
                    'source_metrics': {
                        'current_year_verified': 5,
                        'previous_year_verified': 4,
                        'growth_rate_pct': 25.0,
                    },
                    'time_period': "Academic Year 2024-25 vs 2023-24",
                    'recommended_action': "Maintain submission cadence across other engineering departments.",
                    'is_active': True,
                }
            )

            AIExecutiveInsight.objects.get_or_create(
                college=college_a,
                title="Department Evidence Gap: IT Department Participation Low",
                category=InsightCategory.GAP,
                defaults={
                    'academic_year': ay_current,
                    'severity': InsightSeverity.HIGH,
                    'narrative': "The Department of Information Technology has 1 pending submission and 0 verified evidence mapped to NAAC Criterion 1 & 3 metrics, posing an AQAR completion risk.",
                    'source_metrics': {
                        'department': 'IT',
                        'verified_evidence_count': 0,
                        'pending_submissions': 1,
                    },
                    'time_period': "Current Academic Year",
                    'recommended_action': "IQAC Coordinator should engage IT Department In-charge to expedite verification and artifact collection.",
                    'is_active': True,
                }
            )

            AIExecutiveInsight.objects.get_or_create(
                college=college_a,
                title="Pipeline Bottleneck at HOD Review Stage",
                category=InsightCategory.BOTTLENECK,
                defaults={
                    'academic_year': ay_current,
                    'severity': InsightSeverity.MEDIUM,
                    'narrative': "Submissions at the HOD verification stage exhibit an average latency of 4.2 days compared to target SLA of 3 days.",
                    'source_metrics': {
                        'stage': 'HOD_APPROVAL',
                        'avg_turnaround_days': 4.2,
                        'target_sla_days': 3.0,
                    },
                    'time_period': "Last 30 Days",
                    'recommended_action': "Enable automated reminder notifications to HODs with pending queues exceeding 3 items.",
                    'is_active': True,
                }
            )

            AIExecutiveInsight.objects.get_or_create(
                college=college_a,
                title="Data Hygiene: 2 Records Missing Supporting Document Metadata",
                category=InsightCategory.QUALITY,
                defaults={
                    'academic_year': ay_current,
                    'severity': InsightSeverity.LOW,
                    'narrative': "Data Quality scanner detected 2 activity records with blank descriptions or missing organizer details.",
                    'source_metrics': {
                        'data_quality_score': 94.2,
                        'issues_detected': 2,
                    },
                    'time_period': "Current Academic Year",
                    'recommended_action': "Prompt faculty to update missing organizer and venue metadata during quarterly reconciliation.",
                    'is_active': True,
                }
            )

            ScheduledAnalyticsConfig.objects.get_or_create(
                college=college_a,
                report_title='Monthly Quality Assurance Executive Digest',
                defaults={
                    'frequency': 'MONTHLY',
                    'recipient_role': 'COLLEGE_MANAGEMENT',
                    'target_email': 'management@demo.edu',
                    'is_active': True,
                }
            )
            self.stdout.write(self.style.SUCCESS('Seeded Phase 9 Advanced Analytics & Executive Intelligence Data'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Notice: Phase 9 seed error: {e}'))

        # =========================================================================
        # PHASE 10: NOTIFICATION, TASK & WORKFLOW AUTOMATION DEMO DATA
        # =========================================================================
        try:
            from apps.notifications.models import (
                Notification, NotificationCategory, NotificationPriority,
                NotificationPreference, NotificationTemplate,
                IQACTask, TaskStatus, TaskPriority, TaskActivity, TaskActivityAction, TaskComment,
                AutomationRule
            )
            from apps.notifications.services import TaskService, NotificationDispatcher

            # 1. Notification Templates
            templates_data = [
                {
                    'code': 'SUBMISSION_NEW',
                    'title_template': 'New Submission: {{activity_title}}',
                    'body_template': '{{faculty_name}} submitted an activity for Department In-charge verification.',
                    'action_url_template': '/incharge/verification/{{activity_id}}',
                    'action_label': 'Review Submission',
                },
                {
                    'code': 'INCHARGE_VERIFIED',
                    'title_template': 'Awaiting HOD Approval: {{activity_title}}',
                    'body_template': 'Department In-charge verified {{activity_title}} by {{faculty_name}}.',
                    'action_url_template': '/hod/verification/{{activity_id}}',
                    'action_label': 'Approve Record',
                },
                {
                    'code': 'HOD_APPROVED',
                    'title_template': 'Pending Final IQAC: {{activity_title}}',
                    'body_template': 'HOD approved {{activity_title}} from {{department_name}}.',
                    'action_url_template': '/iqac/verification/{{activity_id}}',
                    'action_label': 'Verify Evidence',
                },
                {
                    'code': 'TASK_ASSIGNED',
                    'title_template': 'Task Assigned: {{task_title}}',
                    'body_template': 'You have been assigned task {{task_title}}. Due: {{due_date}}.',
                    'action_url_template': '/notifications',
                    'action_label': 'View Task',
                },
                {
                    'code': 'TASK_OVERDUE',
                    'title_template': 'Overdue Task: {{task_title}}',
                    'body_template': 'Task {{task_title}} is past its scheduled deadline. Immediate resolution requested.',
                    'action_url_template': '/notifications',
                    'action_label': 'Resolve Task',
                },
            ]
            for td in templates_data:
                NotificationTemplate.objects.get_or_create(
                    college=college_a,
                    code=td['code'],
                    defaults=td
                )

            # 2. Notification Preferences for All Demo Users
            all_demo_users = [super_admin, mgmt_user, iqac_user, hod_cse, incharge_cse, faculty_1, faculty_2]
            for u in all_demo_users:
                NotificationPreference.objects.get_or_create(
                    user=u,
                    defaults={
                        'college': college_a if u != super_admin else None,
                        'in_app_enabled': True,
                        'email_enabled': True,
                        'category_verification': True,
                        'category_tasks': True,
                        'category_deadlines': True,
                        'category_aqar_ssr': True,
                        'category_reports': True,
                        'category_system': True,
                    }
                )

            # 3. Automation Rules
            AutomationRule.objects.get_or_create(
                college=college_a,
                name="Auto Task on Critical Metric Gap",
                trigger="METRIC_GAP_DETECTED",
                defaults={
                    'description': "Generates an evidence gathering task for Department In-charge if metric has 0 verified records.",
                    'action': "CREATE_TASK",
                    'action_config': {
                        'title': "Collect Missing Documentation for Accreditation Benchmark",
                        'priority': "HIGH",
                        'days_due': 10
                    },
                    'is_active': True,
                    'cooldown_hours': 48,
                }
            )
            AutomationRule.objects.get_or_create(
                college=college_a,
                name="Escalate Overdue Tasks to HOD",
                trigger="TASK_OVERDUE",
                defaults={
                    'description': "Sends high-visibility escalation notification to Head of Department when task is overdue > 3 days.",
                    'action': "NOTIFY_INCHARGE",
                    'action_config': {'escalate_role': 'HOD'},
                    'is_active': True,
                    'cooldown_hours': 24,
                }
            )

            # 4. Realistic IQAC Tasks
            today = timezone.now().date()
            m_sample = Metric.objects.filter(college=college_a).first()
            e_sample = Evidence.objects.filter(college=college_a).first()

            # Task 1: Due in 3 days (Department In-charge)
            t1, _ = IQACTask.objects.get_or_create(
                college=college_a,
                title="Reconcile CSE Faculty Publication DOI Links",
                defaults={
                    'owner': incharge_cse,
                    'creator': iqac_user,
                    'department': dept_map['CSE'],
                    'academic_year': ay_current,
                    'priority': TaskPriority.HIGH,
                    'due_date': today + datetime.timedelta(days=3),
                    'status': TaskStatus.IN_PROGRESS,
                    'related_metric': m_sample,
                    'description': "Verify that all IEEE and Scopus publication records for CSE faculty have active DOI resolver URLs attached.",
                }
            )
            TaskActivity.objects.get_or_create(
                task=t1, action=TaskActivityAction.CREATED,
                defaults={'actor': iqac_user, 'details': 'Task assigned to Prof. Vikram Joshi.'}
            )
            TaskActivity.objects.get_or_create(
                task=t1, action=TaskActivityAction.STARTED,
                defaults={'actor': incharge_cse, 'details': 'Commenced Scopus verification across 12 faculty profiles.'}
            )
            TaskComment.objects.get_or_create(
                task=t1, author=iqac_user,
                defaults={'comment': 'Please ensure Q1/Q2 journal indexing proof is cross-referenced.'}
            )

            # Task 2: Due Tomorrow (Faculty 1)
            t2, _ = IQACTask.objects.get_or_create(
                college=college_a,
                title="Upload Consultancy Agreement & Financial Ledger Extract",
                defaults={
                    'owner': faculty_1,
                    'creator': incharge_cse,
                    'department': dept_map['CSE'],
                    'academic_year': ay_current,
                    'priority': TaskPriority.HIGH,
                    'due_date': today + datetime.timedelta(days=1),
                    'status': TaskStatus.TODO,
                    'related_evidence': e_sample,
                    'description': "Upload signed industry consultancy agreement and institute accounts receipt proof for Metric 3.5.2.",
                }
            )

            # Task 3: Overdue by 2 days (Faculty 2)
            t3, _ = IQACTask.objects.get_or_create(
                college=college_a,
                title="Submit FDP Participation Certificate - Cyber Security",
                defaults={
                    'owner': faculty_2,
                    'creator': incharge_cse,
                    'department': dept_map['IT'],
                    'academic_year': ay_current,
                    'priority': TaskPriority.URGENT,
                    'due_date': today - datetime.timedelta(days=2),
                    'status': TaskStatus.TODO,
                    'description': "Attendance certificate for AICTE sponsored 5-day FDP on Cloud Forensics.",
                }
            )
            TaskActivity.objects.get_or_create(
                task=t3, action=TaskActivityAction.ESCALATED,
                defaults={'actor': None, 'details': 'System escalated to HOD due to overdue timeline.'}
            )

            # Task 4: Due this week (HOD Deshmukh)
            t4, _ = IQACTask.objects.get_or_create(
                college=college_a,
                title="Review and Finalize Criterion 2 Narrative Summary",
                defaults={
                    'owner': hod_cse,
                    'creator': iqac_user,
                    'department': dept_map['CSE'],
                    'academic_year': ay_current,
                    'priority': TaskPriority.HIGH,
                    'due_date': today + datetime.timedelta(days=5),
                    'status': TaskStatus.TODO,
                    'description': "Review qualitative narrative text for Teaching-Learning Process before AQAR assembly.",
                }
            )

            # Task 5: Completed Task (In-charge)
            t5, _ = IQACTask.objects.get_or_create(
                college=college_a,
                title="Compile Student Satisfaction Survey Sampling Register",
                defaults={
                    'owner': incharge_cse,
                    'creator': iqac_user,
                    'department': dept_map['CSE'],
                    'academic_year': ay_current,
                    'priority': TaskPriority.LOW,
                    'due_date': today - datetime.timedelta(days=10),
                    'status': TaskStatus.COMPLETED,
                    'completed_at': timezone.now() - datetime.timedelta(days=8),
                    'completed_by': incharge_cse,
                    'description': "Verify student enrollment database matches SSS survey recipient registry.",
                }
            )

            # 5. Realistic Seed Notifications for Each Role
            # For IQAC Coordinator
            Notification.objects.get_or_create(
                college=college_a,
                recipient=iqac_user,
                title="HOD Approved: International Conference on Quantum Computing",
                category=NotificationCategory.VERIFICATION,
                defaults={
                    'sender': hod_cse,
                    'body': "Dr. Anita Deshmukh approved CSE submission for final IQAC quality seal.",
                    'priority': NotificationPriority.NORMAL,
                    'notification_type': 'HOD_APPROVED',
                    'action_url': '/iqac/verification',
                    'action_label': 'Verify Evidence',
                    'is_read': False,
                }
            )
            Notification.objects.get_or_create(
                college=college_a,
                recipient=iqac_user,
                title="Metric Gap Detected: Metric 3.3.2 (Research Grants)",
                category=NotificationCategory.METRIC,
                defaults={
                    'sender': None,
                    'body': "Metric 3.3.2 currently has zero verified evidence records for current cycle.",
                    'priority': NotificationPriority.HIGH,
                    'notification_type': 'METRIC_GAP_DETECTED',
                    'action_url': '/criteria',
                    'action_label': 'Review Metric',
                    'is_read': False,
                }
            )

            # For HOD CSE
            Notification.objects.get_or_create(
                college=college_a,
                recipient=hod_cse,
                title="Awaiting HOD Approval: IoT Smart Agriculture Workshop",
                category=NotificationCategory.VERIFICATION,
                defaults={
                    'sender': incharge_cse,
                    'body': "Prof. Vikram Joshi completed in-charge verification. Awaiting your departmental sign-off.",
                    'priority': NotificationPriority.NORMAL,
                    'notification_type': 'INCHARGE_VERIFIED',
                    'action_url': '/hod/verification',
                    'action_label': 'Review Submission',
                    'is_read': False,
                }
            )
            Notification.objects.get_or_create(
                college=college_a,
                recipient=hod_cse,
                title="Escalation: Task Overdue by Faculty Doe",
                category=NotificationCategory.DEADLINE,
                defaults={
                    'sender': None,
                    'body': "Task 'Submit FDP Participation Certificate' is 2 days overdue.",
                    'priority': NotificationPriority.HIGH,
                    'notification_type': 'TASK_OVERDUE_SUPERVISOR',
                    'action_url': '/notifications',
                    'action_label': 'View Escalation',
                    'is_read': False,
                }
            )

            # For Department In-charge CSE
            Notification.objects.get_or_create(
                college=college_a,
                recipient=incharge_cse,
                title="New Submission: Cloud Architecture Masterclass",
                category=NotificationCategory.VERIFICATION,
                defaults={
                    'sender': faculty_1,
                    'body': "Prof. Rahul Kulkarni submitted new faculty training record for verification.",
                    'priority': NotificationPriority.NORMAL,
                    'notification_type': 'SUBMISSION_NEW',
                    'action_url': '/incharge/verification',
                    'action_label': 'Review Evidence',
                    'is_read': False,
                }
            )
            Notification.objects.get_or_create(
                college=college_a,
                recipient=incharge_cse,
                title="Deadline Reminder: Reconcile CSE Faculty Publication DOI Links",
                category=NotificationCategory.DEADLINE,
                defaults={
                    'sender': None,
                    'body': "Task due in 3 days. 8 of 12 profiles reconciled.",
                    'priority': NotificationPriority.NORMAL,
                    'notification_type': 'TASK_DUE_SOON',
                    'action_url': '/notifications',
                    'action_label': 'Open Task',
                    'is_read': False,
                }
            )

            # For Faculty 1
            Notification.objects.get_or_create(
                college=college_a,
                recipient=faculty_1,
                title="Officially Verified: Deep Learning for Computer Vision",
                category=NotificationCategory.EVIDENCE,
                defaults={
                    'sender': iqac_user,
                    'body': "Congratulations! Your activity has received final IQAC verification and is cataloged in institutional evidence.",
                    'priority': NotificationPriority.NORMAL,
                    'notification_type': 'VERIFIED_EVIDENCE',
                    'action_url': '/faculty/activities',
                    'action_label': 'View Certificate',
                    'is_read': True,
                    'read_at': timezone.now() - datetime.timedelta(hours=5),
                }
            )
            Notification.objects.get_or_create(
                college=college_a,
                recipient=faculty_1,
                title="Task Due Tomorrow: Upload Consultancy Agreement",
                category=NotificationCategory.DEADLINE,
                defaults={
                    'sender': incharge_cse,
                    'body': "Due date is tomorrow. Please attach audited receipt extract.",
                    'priority': NotificationPriority.HIGH,
                    'notification_type': 'TASK_DUE_SOON',
                    'action_url': '/notifications',
                    'action_label': 'Complete Task',
                    'is_read': False,
                }
            )

            # For College Management
            Notification.objects.get_or_create(
                college=college_a,
                recipient=mgmt_user,
                title="Executive Briefing: Monthly Quality Assurance Overview",
                category=NotificationCategory.REPORT,
                defaults={
                    'sender': iqac_user,
                    'body': "Executive monthly digest generated. Overall institutional AQAR readiness reached 82.5%.",
                    'priority': NotificationPriority.LOW,
                    'notification_type': 'REPORT_GENERATED',
                    'action_url': '/management/analytics',
                    'action_label': 'View Analytics',
                    'is_read': False,
                }
            )

            self.stdout.write(self.style.SUCCESS('Seeded Phase 10 Notification, Task & Workflow Automation Data'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Notice: Phase 10 seed error: {e}'))

        # Initial Audit Logs
        AuditLog.objects.create(
            college=college_a,
            actor=super_admin,
            actor_role='SUPER_ADMIN',
            actor_email=super_admin.email,
            action='COLLEGE_INITIALIZED',
            model_name='College',
            object_id=str(college_a.id),
            object_repr=college_a.name,
            comment='System provisioned Demo Engineering College.'
        )

        self.stdout.write(self.style.SUCCESS('\n=== DEMO ACCOUNTS ON POSTGRESQL ==='))
        self.stdout.write('1. Super Admin:        admin@iqac.local / admin123')
        self.stdout.write('2. College Management: management@demo.edu / demo123')
        self.stdout.write('3. IQAC Coordinator:   iqac@demo.edu / demo123')
        self.stdout.write('4. HOD (CSE):          hod.cse@demo.edu / demo123')
        self.stdout.write('5. Dept In-charge:     incharge.cse@demo.edu / demo123')
        self.stdout.write('6. Faculty (CSE):      faculty.smith@demo.edu / demo123')
        self.stdout.write('7. Faculty (IT):       faculty.doe@demo.edu / demo123')
        self.stdout.write('8. Faculty (College B):faculty@apex.edu / demo123 (Tenant Isolation Test)')
