"""
Seed/Configure HOD accounts for all 11 departments in Demo Engineering College (DEMO-ENG).
Departments:
- IT
- CSE
- AIDS
- AIML
- ECE
- EEE
- CIVIL
- MBA
- MECH
- ME
- CYBERSECURITY
"""
from django.core.management.base import BaseCommand
from apps.colleges.models import College
from apps.departments.models import Department
from apps.accounts.models import User, UserRole, FacultyProfile


HOD_PROFILES = [
    {
        "dept_code": "IT",
        "email": "hod.it@demo.edu",
        "first_name": "Dr. Rajesh",
        "last_name": "Nair",
        "employee_id": "EMP-HOD-IT",
        "designation": "Professor & HOD",
    },
    {
        "dept_code": "CSE",
        "email": "hod.cse@demo.edu",
        "first_name": "Dr. Anita",
        "last_name": "Deshmukh",
        "employee_id": "EMP-HOD-CSE",
        "designation": "Professor & HOD",
    },
    {
        "dept_code": "AIDS",
        "email": "hod.aids@demo.edu",
        "first_name": "Dr. Meera",
        "last_name": "Patel",
        "employee_id": "EMP-HOD-AIDS",
        "designation": "Professor & HOD",
    },
    {
        "dept_code": "AIML",
        "email": "hod.aiml@demo.edu",
        "first_name": "Dr. Karthik",
        "last_name": "Sundaram",
        "employee_id": "EMP-HOD-AIML",
        "designation": "Professor & HOD",
    },
    {
        "dept_code": "ECE",
        "email": "hod.ece@demo.edu",
        "first_name": "Dr. Sunita",
        "last_name": "Rao",
        "employee_id": "EMP-HOD-ECE",
        "designation": "Professor & HOD",
    },
    {
        "dept_code": "EEE",
        "email": "hod.eee@demo.edu",
        "first_name": "Dr. Ramesh",
        "last_name": "Sharma",
        "employee_id": "EMP-HOD-EEE",
        "designation": "Professor & HOD",
    },
    {
        "dept_code": "CIVIL",
        "email": "hod.civil@demo.edu",
        "first_name": "Dr. Arvind",
        "last_name": "Kulkarni",
        "employee_id": "EMP-HOD-CIVIL",
        "designation": "Professor & HOD",
    },
    {
        "dept_code": "MBA",
        "email": "hod.mba@demo.edu",
        "first_name": "Dr. Priya",
        "last_name": "Menon",
        "employee_id": "EMP-HOD-MBA",
        "designation": "Professor & HOD",
    },
    {
        "dept_code": "MECH",
        "email": "hod.mech@demo.edu",
        "first_name": "Dr. Deepak",
        "last_name": "Verma",
        "employee_id": "EMP-HOD-MECH",
        "designation": "Professor & HOD",
    },
    {
        "dept_code": "ME",
        "email": "hod.me@demo.edu",
        "first_name": "Dr. Sanjay",
        "last_name": "Patil",
        "employee_id": "EMP-HOD-ME",
        "designation": "Professor & HOD",
    },
    {
        "dept_code": "CYBERSECURITY",
        "email": "hod.cybersecurity@demo.edu",
        "first_name": "Dr. Pooja",
        "last_name": "Shah",
        "employee_id": "EMP-HOD-CYBER",
        "designation": "Professor & HOD",
    },
]


class Command(BaseCommand):
    help = "Seed/configure HOD accounts for all 11 departments in Demo Engineering College"

    def handle(self, *args, **options):
        college = College.objects.filter(code="DEMO-ENG").first()
        if not college:
            self.stdout.write(self.style.ERROR("Demo Engineering College (DEMO-ENG) not found!"))
            return

        created_count = 0
        updated_count = 0

        for profile in HOD_PROFILES:
            dept = Department.objects.filter(code=profile["dept_code"], college=college).first()
            if not dept:
                self.stdout.write(self.style.WARNING(f"Department {profile['dept_code']} not found, skipping."))
                continue

            user, created = User.objects.get_or_create(
                email=profile["email"],
                defaults={
                    "first_name": profile["first_name"],
                    "last_name": profile["last_name"],
                    "employee_id": profile["employee_id"],
                    "designation": profile["designation"],
                    "role": UserRole.HOD,
                    "college": college,
                    "department": dept,
                    "is_active": True,
                    "is_email_verified": True,
                }
            )

            # Ensure password, role, college, department are updated
            user.set_password("demo123")
            user.role = UserRole.HOD
            user.college = college
            user.department = dept
            user.designation = profile["designation"]
            user.first_name = profile["first_name"]
            user.last_name = profile["last_name"]
            user.is_active = True
            user.save()

            # Ensure FacultyProfile
            FacultyProfile.objects.update_or_create(
                user=user,
                defaults={
                    "college": college,
                    "department": dept,
                    "employee_id": profile["employee_id"],
                    "designation": profile["designation"],
                    "qualification": "Ph.D. in Engineering",
                    "status": "ACTIVE",
                }
            )

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created HOD account: {profile['email']} ({dept.code})"))
            else:
                updated_count += 1
                self.stdout.write(self.style.SUCCESS(f"Configured existing HOD account: {profile['email']} ({dept.code})"))

        self.stdout.write(self.style.SUCCESS(f"Done! Created: {created_count}, Configured: {updated_count} HOD accounts."))
