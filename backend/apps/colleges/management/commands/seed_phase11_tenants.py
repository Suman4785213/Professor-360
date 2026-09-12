"""
Seed Data Command — Phase 11: Multi-College SaaS & Super Admin Control Center
Creates standard SaaS plans (Starter, Professional, Enterprise) and 3 isolated
demo tenants (College A: Apex, College B: Beacon, College C: Crestview) with distinct
users, departments, activities, evidence, and subscriptions.
"""
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.colleges.models import (
    College, Plan, Subscription, TenantFeatureFlag,
    TenantUsage, CollegeStatus, SubscriptionStatus, BillingCycle, FeatureFlagKey
)
from apps.accounts.models import User, UserRole, FacultyProfile
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityCategory, Document, ActivityStatus, DocumentType
from apps.evidence.models import Evidence
from apps.criteria.models import Framework, Section, Criterion, Metric


class Command(BaseCommand):
    help = 'Seeds standard SaaS plans and 3 isolated multi-tenant colleges (A, B, C).'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Initializing SaaS Plans & Demo Tenants (Phase 11)..."))

        # 1. Create Plans
        starter_plan, _ = Plan.objects.get_or_create(
            code='starter',
            defaults={
                'name': 'Starter Tier',
                'description': 'Essential quality assurance tools for small institutions and colleges.',
                'price_monthly': 49.00,
                'price_yearly': 490.00,
                'max_users': 25,
                'max_departments': 5,
                'max_faculty': 50,
                'storage_limit_gb': 5.0,
                'ai_processing_limit': 50,
                'max_reports_monthly': 25,
                'max_academic_years': 3,
                'features': {
                    FeatureFlagKey.AI_PROCESSING: False,
                    FeatureFlagKey.AI_SEARCH: False,
                    FeatureFlagKey.AQAR_WORKSPACE: True,
                    FeatureFlagKey.SSR_WORKSPACE: False,
                    FeatureFlagKey.ADVANCED_ANALYTICS: False,
                    FeatureFlagKey.REPORT_GENERATION: True,
                    FeatureFlagKey.AUTOMATION: True,
                    FeatureFlagKey.BULK_EXPORT: False,
                },
                'is_active': True,
            }
        )

        pro_plan, _ = Plan.objects.get_or_create(
            code='professional',
            defaults={
                'name': 'Professional Tier',
                'description': 'Advanced automation, AI classification, and multi-department analytics.',
                'price_monthly': 149.00,
                'price_yearly': 1490.00,
                'max_users': 150,
                'max_departments': 20,
                'max_faculty': 300,
                'storage_limit_gb': 25.0,
                'ai_processing_limit': 500,
                'max_reports_monthly': 150,
                'max_academic_years': 7,
                'features': {
                    FeatureFlagKey.AI_PROCESSING: True,
                    FeatureFlagKey.AI_SEARCH: True,
                    FeatureFlagKey.AQAR_WORKSPACE: True,
                    FeatureFlagKey.SSR_WORKSPACE: True,
                    FeatureFlagKey.ADVANCED_ANALYTICS: True,
                    FeatureFlagKey.REPORT_GENERATION: True,
                    FeatureFlagKey.AUTOMATION: True,
                    FeatureFlagKey.BULK_EXPORT: True,
                },
                'is_active': True,
            }
        )

        enterprise_plan, _ = Plan.objects.get_or_create(
            code='enterprise',
            defaults={
                'name': 'Enterprise Tier',
                'description': 'Unlimited institutional scaling, dedicated AI intelligence, and full compliance suites.',
                'price_monthly': 299.00,
                'price_yearly': 2990.00,
                'max_users': 1000,
                'max_departments': 60,
                'max_faculty': 2000,
                'storage_limit_gb': 100.0,
                'ai_processing_limit': 5000,
                'max_reports_monthly': 1000,
                'max_academic_years': 15,
                'features': {
                    FeatureFlagKey.AI_PROCESSING: True,
                    FeatureFlagKey.AI_SEARCH: True,
                    FeatureFlagKey.AQAR_WORKSPACE: True,
                    FeatureFlagKey.SSR_WORKSPACE: True,
                    FeatureFlagKey.ADVANCED_ANALYTICS: True,
                    FeatureFlagKey.REPORT_GENERATION: True,
                    FeatureFlagKey.AUTOMATION: True,
                    FeatureFlagKey.BULK_EXPORT: True,
                },
                'is_active': True,
            }
        )
        self.stdout.write(self.style.SUCCESS("  [OK] SaaS Plans verified (Starter, Professional, Enterprise)"))

        # 2. Update College A: Apex Institute of Technology (Existing Primary Tenant)
        college_a = College.objects.filter(code='AIT').first()
        if not college_a:
            college_a = College.objects.filter(code='DEMO_ENG').first()
        if college_a:
            college_a.name = 'Apex Institute of Technology'
            college_a.short_name = 'Apex Institute'
            college_a.code = 'AIT'
            college_a.institution_code = 'AISHE-C-19482'
            college_a.status = CollegeStatus.ACTIVE
            college_a.setup_completed = True
            college_a.setup_step = 9
            college_a.branding_config = {
                'primary_color': '#2563eb',
                'secondary_color': '#1e40af',
                'report_header': 'Apex Institute of Technology — Accredited NAAC A++ (CGPA 3.82)',
                'report_footer': 'Apex Institute of Technology, Innovation Campus, Pune 411001',
            }
            college_a.save()

            # Ensure subscription
            Subscription.objects.update_or_create(
                college=college_a,
                defaults={
                    'plan': enterprise_plan,
                    'status': SubscriptionStatus.ACTIVE,
                    'billing_cycle': BillingCycle.YEARLY,
                    'current_period_start': timezone.now() - timedelta(days=60),
                    'current_period_end': timezone.now() + timedelta(days=305),
                    'auto_renew': True,
                    'subscription_id': 'sub_live_ait_enterprise_01',
                }
            )
            TenantUsage.objects.get_or_create(college=college_a)
            self.stdout.write(self.style.SUCCESS("  [OK] College A (Apex Institute) configured with Enterprise Plan"))

        # 3. Create College B: Beacon University of Engineering
        college_b, created_b = College.objects.get_or_create(
            code='BUE',
            defaults={
                'name': 'Beacon University of Engineering',
                'short_name': 'Beacon Engineering',
                'institution_code': 'AISHE-U-08421',
                'address': '104 Innovation Way, Tech Corridor',
                'city': 'Bengaluru',
                'state': 'Karnataka',
                'pincode': '560100',
                'phone': '+91 80 4455 6677',
                'email': 'iqac@beacon.edu.in',
                'website': 'https://beacon.edu.in',
                'accreditation_type': 'NAAC',
                'naac_grade': 'A',
                'established_year': 2008,
                'status': CollegeStatus.ACTIVE,
                'setup_completed': True,
                'setup_step': 9,
                'branding_config': {
                    'primary_color': '#7c3aed',
                    'secondary_color': '#5b21b6',
                    'report_header': 'Beacon University of Engineering — NAAC Accredited Grade A',
                    'report_footer': 'Beacon University of Engineering, Bengaluru, Karnataka',
                }
            }
        )

        Subscription.objects.update_or_create(
            college=college_b,
            defaults={
                'plan': pro_plan,
                'status': SubscriptionStatus.ACTIVE,
                'billing_cycle': BillingCycle.YEARLY,
                'current_period_start': timezone.now() - timedelta(days=30),
                'current_period_end': timezone.now() + timedelta(days=335),
                'auto_renew': True,
                'subscription_id': 'sub_live_bue_pro_02',
            }
        )
        TenantUsage.objects.get_or_create(college=college_b)

        # College B Departments
        dept_robotics, _ = Department.objects.get_or_create(
            college=college_b,
            code='ROB',
            defaults={'name': 'Robotics & Automation', 'description': 'Department of Robotics & Autonomous Systems'}
        )
        dept_civil, _ = Department.objects.get_or_create(
            college=college_b,
            code='CIVIL',
            defaults={'name': 'Civil & Structural Engineering', 'description': 'Department of Infrastructure & Civil Engineering'}
        )

        # College B Academic Year
        ay_b, _ = AcademicYear.objects.get_or_create(
            college=college_b,
            name='2024-25',
            defaults={
                'start_date': date(2024, 6, 1),
                'end_date': date(2025, 5, 31),
                'is_active': True,
                'is_current': True,
            }
        )

        # College B Users
        u_b_iqac, _ = User.objects.get_or_create(
            email='iqac.bue@iqac.edu',
            defaults={
                'first_name': 'Suresh',
                'last_name': 'Natarajan',
                'role': UserRole.IQAC,
                'college': college_b,
                'is_active': True,
                'is_email_verified': True,
                'designation': 'IQAC Director',
            }
        )
        u_b_iqac.set_password('IQAC@1234')
        u_b_iqac.save()

        u_b_mgmt, _ = User.objects.get_or_create(
            email='management.bue@iqac.edu',
            defaults={
                'first_name': 'Ramesh',
                'last_name': 'Kothari',
                'role': UserRole.COLLEGE_MANAGEMENT,
                'college': college_b,
                'is_active': True,
                'is_email_verified': True,
                'designation': 'Trustee & Secretary',
            }
        )
        u_b_mgmt.set_password('Mgmt@1234')
        u_b_mgmt.save()

        u_b_hod, _ = User.objects.get_or_create(
            email='hod.robotics@iqac.edu',
            defaults={
                'first_name': 'Pooja',
                'last_name': 'Sundaram',
                'role': UserRole.HOD,
                'college': college_b,
                'department': dept_robotics,
                'is_active': True,
                'is_email_verified': True,
                'designation': 'Professor & Head',
            }
        )
        u_b_hod.set_password('HOD@1234')
        u_b_hod.save()
        dept_robotics.hod = u_b_hod
        dept_robotics.save()

        u_b_fac, _ = User.objects.get_or_create(
            email='faculty.bue@iqac.edu',
            defaults={
                'first_name': 'Deepak',
                'last_name': 'Menon',
                'role': UserRole.FACULTY,
                'college': college_b,
                'department': dept_robotics,
                'is_active': True,
                'is_email_verified': True,
                'designation': 'Assistant Professor',
                'employee_id': 'BUE-ROB-014',
            }
        )
        u_b_fac.set_password('Faculty@1234')
        u_b_fac.save()
        FacultyProfile.objects.get_or_create(
            user=u_b_fac,
            defaults={
                'college': college_b,
                'department': dept_robotics,
                'designation': 'Assistant Professor',
                'employee_id': 'BUE-ROB-014',
            }
        )

        # College B Evidence
        cat_conf = ActivityCategory.objects.filter(code='CONFERENCE').first()
        act_b, _ = Activity.objects.get_or_create(
            college=college_b,
            faculty=u_b_fac,
            title='International Conference on Robotics & Autonomous Navigation (ICRAN 2024)',
            defaults={
                'department': dept_robotics,
                'academic_year': ay_b,
                'category': cat_conf,
                'activity_type': 'CONFERENCE',
                'start_date': date(2024, 9, 10),
                'end_date': date(2024, 9, 12),
                'organizer': 'IEEE Robotics Society & Beacon University',
                'venue': 'Bengaluru International Exhibition Centre',
                'status': ActivityStatus.VERIFIED_EVIDENCE,
                'is_online': False,
            }
        )

        Evidence.objects.get_or_create(
            college=college_b,
            activity=act_b,
            defaults={
                'department': dept_robotics,
                'faculty': u_b_fac,
                'academic_year': ay_b,
                'title': 'Conference Presentation & Proceedings — Autonomous UAV Swarms',
                'category': 'CONFERENCE',
                'tags': ['Robotics', 'IEEE', 'UAV', 'Beacon'],
                'is_verified': True,
                'verified_at': timezone.now(),
                'status': 'ACTIVE',
            }
        )
        self.stdout.write(self.style.SUCCESS("  [OK] College B (Beacon University) seeded with isolated records"))

        # 4. Create College C: Crestview College of Arts and Science
        college_c, created_c = College.objects.get_or_create(
            code='CCAS',
            defaults={
                'name': 'Crestview College of Arts and Science',
                'short_name': 'Crestview College',
                'institution_code': 'AISHE-C-33190',
                'address': '45 Heritage Avenue, University Enclave',
                'city': 'Pune',
                'state': 'Maharashtra',
                'pincode': '411007',
                'phone': '+91 20 2566 9988',
                'email': 'iqac@crestview.ac.in',
                'website': 'https://crestview.ac.in',
                'accreditation_type': 'NAAC',
                'naac_grade': 'B++',
                'established_year': 2012,
                'status': CollegeStatus.ACTIVE,
                'setup_completed': True,
                'setup_step': 9,
                'branding_config': {
                    'primary_color': '#059669',
                    'secondary_color': '#047857',
                    'report_header': 'Crestview College of Arts and Science — Quality Assurance Cell',
                    'report_footer': 'Crestview College, University Enclave, Pune',
                }
            }
        )

        Subscription.objects.update_or_create(
            college=college_c,
            defaults={
                'plan': starter_plan,
                'status': SubscriptionStatus.TRIAL,
                'billing_cycle': BillingCycle.MONTHLY,
                'current_period_start': timezone.now() - timedelta(days=7),
                'current_period_end': timezone.now() + timedelta(days=23),
                'trial_ends_at': timezone.now() + timedelta(days=7),
                'auto_renew': True,
                'subscription_id': 'sub_trial_ccas_starter_03',
            }
        )
        TenantUsage.objects.get_or_create(college=college_c)

        # College C Department
        dept_commerce, _ = Department.objects.get_or_create(
            college=college_c,
            code='COMM',
            defaults={'name': 'Commerce & Business Studies', 'description': 'Department of Financial Accounting & Management'}
        )

        ay_c, _ = AcademicYear.objects.get_or_create(
            college=college_c,
            name='2024-25',
            defaults={
                'start_date': date(2024, 6, 15),
                'end_date': date(2025, 5, 15),
                'is_active': True,
                'is_current': True,
            }
        )

        u_c_iqac, _ = User.objects.get_or_create(
            email='iqac.ccas@iqac.edu',
            defaults={
                'first_name': 'Meera',
                'last_name': 'Deshmukh',
                'role': UserRole.IQAC,
                'college': college_c,
                'is_active': True,
                'is_email_verified': True,
                'designation': 'IQAC Coordinator',
            }
        )
        u_c_iqac.set_password('IQAC@1234')
        u_c_iqac.save()

        u_c_fac, _ = User.objects.get_or_create(
            email='faculty.ccas@iqac.edu',
            defaults={
                'first_name': 'Ananya',
                'last_name': 'Joshi',
                'role': UserRole.FACULTY,
                'college': college_c,
                'department': dept_commerce,
                'is_active': True,
                'is_email_verified': True,
                'designation': 'Lecturer in Commerce',
                'employee_id': 'CCAS-COMM-005',
            }
        )
        u_c_fac.set_password('Faculty@1234')
        u_c_fac.save()
        FacultyProfile.objects.get_or_create(
            user=u_c_fac,
            defaults={
                'college': college_c,
                'department': dept_commerce,
                'designation': 'Lecturer in Commerce',
                'employee_id': 'CCAS-COMM-005',
            }
        )

        self.stdout.write(self.style.SUCCESS("  [OK] College C (Crestview College) seeded on Trial Starter plan"))
        self.stdout.write(self.style.SUCCESS("Phase 11 Demo Tenants and SaaS plans successfully seeded!"))
