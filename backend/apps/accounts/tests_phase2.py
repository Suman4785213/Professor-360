from django.test import TestCase
from rest_framework.test import APIClient
from apps.colleges.models import College
from apps.departments.models import Department
from apps.programs.models import Program, ProgramStatus
from apps.academic_years.models import AcademicYear
from apps.accounts.models import User, UserRole, FacultyProfile
from apps.audit.models import AuditLog


class Phase2ComprehensiveTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # College A
        self.college_a = College.objects.create(name='College A', code='COL-A')
        self.dept_cse = Department.objects.create(college=self.college_a, name='Computer Science', code='CSE')
        self.dept_it = Department.objects.create(college=self.college_a, name='Information Technology', code='IT')
        self.ay_a = AcademicYear.objects.create(
            college=self.college_a, name='2024-25', start_date='2024-07-01', end_date='2025-06-30', is_current=True
        )
        self.prog_cse = Program.objects.create(
            college=self.college_a, department=self.dept_cse, name='B.Tech CSE', code='BTECH-CSE', degree='B.Tech', duration_years=4
        )

        # College B (for tenant isolation test)
        self.college_b = College.objects.create(name='College B', code='COL-B')
        self.dept_b = Department.objects.create(college=self.college_b, name='College B Dept', code='B-DEPT')
        self.prog_b = Program.objects.create(
            college=self.college_b, department=self.dept_b, name='B.Tech B', code='BTECH-B', degree='B.Tech', duration_years=4
        )

        # Users
        self.super_admin = User.objects.create_superuser(
            email='admin@test.com', password='password123', first_name='Super', last_name='Admin'
        )
        self.iqac_user = User.objects.create_user(
            email='iqac@col-a.edu', password='password123', first_name='IQAC', last_name='Coord',
            college=self.college_a, role=UserRole.IQAC
        )
        self.hod_cse = User.objects.create_user(
            email='hod@col-a.edu', password='password123', first_name='HOD', last_name='CSE',
            college=self.college_a, department=self.dept_cse, role=UserRole.HOD
        )
        self.incharge_cse = User.objects.create_user(
            email='incharge@col-a.edu', password='password123', first_name='Incharge', last_name='CSE',
            college=self.college_a, department=self.dept_cse, role=UserRole.DEPARTMENT_INCHARGE
        )
        self.faculty_cse = User.objects.create_user(
            email='faculty.cse@col-a.edu', password='password123', first_name='Faculty', last_name='CSE',
            college=self.college_a, department=self.dept_cse, role=UserRole.FACULTY, employee_id='CSE-01'
        )
        self.profile_cse = FacultyProfile.objects.create(
            user=self.faculty_cse, college=self.college_a, department=self.dept_cse,
            employee_id='CSE-01', qualification='Ph.D.'
        )

        self.faculty_it = User.objects.create_user(
            email='faculty.it@col-a.edu', password='password123', first_name='Faculty', last_name='IT',
            college=self.college_a, department=self.dept_it, role=UserRole.FACULTY, employee_id='IT-01'
        )
        self.profile_it = FacultyProfile.objects.create(
            user=self.faculty_it, college=self.college_a, department=self.dept_it,
            employee_id='IT-01', qualification='M.Tech.'
        )

        self.faculty_b = User.objects.create_user(
            email='faculty@col-b.edu', password='password123', first_name='Faculty', last_name='B',
            college=self.college_b, department=self.dept_b, role=UserRole.FACULTY, employee_id='COLB-01'
        )
        self.profile_b = FacultyProfile.objects.create(
            user=self.faculty_b, college=self.college_b, department=self.dept_b,
            employee_id='COLB-01', qualification='Ph.D.'
        )

    def _login(self, email, password='password123'):
        res = self.client.post('/api/v1/auth/login/', {'email': email, 'password': password})
        self.assertEqual(res.status_code, 200)
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return res.data

    # --- 1. Authentication Tests ---
    def test_auth_login_valid(self):
        data = self._login('admin@test.com')
        self.assertIn('access', data)
        self.assertEqual(data['user']['role'], 'SUPER_ADMIN')

    def test_auth_login_invalid(self):
        res = self.client.post('/api/v1/auth/login/', {'email': 'admin@test.com', 'password': 'wrong'})
        self.assertEqual(res.status_code, 401)

    def test_auth_logout(self):
        login_data = self._login('admin@test.com')
        res = self.client.post('/api/v1/auth/logout/', {'refresh': login_data['refresh']})
        self.assertEqual(res.status_code, 200)

    def test_forgot_and_reset_password_flow(self):
        # Request reset token
        res = self.client.post('/api/v1/auth/forgot-password/', {'email': 'faculty.cse@col-a.edu'})
        self.assertEqual(res.status_code, 200)
        reset_token = res.data.get('reset_token')
        self.assertIsNotNone(reset_token)

        # Reset password
        reset_res = self.client.post('/api/v1/auth/reset-password/', {
            'token': reset_token,
            'new_password': 'NewPassword123!',
            'confirm_password': 'NewPassword123!',
        })
        self.assertEqual(reset_res.status_code, 200)

        # Verify login works with new password
        login_new = self.client.post('/api/v1/auth/login/', {
            'email': 'faculty.cse@col-a.edu',
            'password': 'NewPassword123!'
        })
        self.assertEqual(login_new.status_code, 200)

    # --- 2. Tenant Isolation Tests ---
    def test_tenant_isolation_departments(self):
        # IQAC user in College A must NOT see College B departments
        self._login('iqac@col-a.edu')
        res = self.client.get('/api/v1/departments/')
        self.assertEqual(res.status_code, 200)
        dept_ids = [d['id'] for d in (res.data.get('results') or res.data)]
        self.assertIn(str(self.dept_cse.id), dept_ids)
        self.assertNotIn(str(self.dept_b.id), dept_ids)

    def test_tenant_isolation_programs(self):
        # IQAC user in College A must NOT see College B programs
        self._login('iqac@col-a.edu')
        res = self.client.get('/api/v1/programs/')
        self.assertEqual(res.status_code, 200)
        prog_ids = [p['id'] for p in (res.data.get('results') or res.data)]
        self.assertIn(str(self.prog_cse.id), prog_ids)
        self.assertNotIn(str(self.prog_b.id), prog_ids)

    def test_tenant_isolation_faculty_profiles(self):
        # HOD in College A must NOT see College B faculty profiles
        self._login('hod@col-a.edu')
        res = self.client.get('/api/v1/auth/faculty/profiles/')
        self.assertEqual(res.status_code, 200)
        emails = [p['user_email'] for p in (res.data.get('results') or res.data)]
        self.assertNotIn('faculty@col-b.edu', emails)

    # --- 3. Department Isolation Tests ---
    def test_department_isolation_hod(self):
        # HOD of CSE must only see CSE faculty, NOT IT faculty
        self._login('hod@col-a.edu')
        res = self.client.get('/api/v1/auth/users/')
        self.assertEqual(res.status_code, 200)
        user_emails = [u['email'] for u in (res.data.get('results') or res.data)]
        self.assertIn('faculty.cse@col-a.edu', user_emails)
        self.assertNotIn('faculty.it@col-a.edu', user_emails)

    def test_department_isolation_incharge(self):
        # In-charge of CSE must only see CSE faculty, NOT IT faculty
        self._login('incharge@col-a.edu')
        res = self.client.get('/api/v1/auth/users/')
        self.assertEqual(res.status_code, 200)
        user_emails = [u['email'] for u in (res.data.get('results') or res.data)]
        self.assertIn('faculty.cse@col-a.edu', user_emails)
        self.assertNotIn('faculty.it@col-a.edu', user_emails)

    # --- 4. Faculty Isolation Tests ---
    def test_faculty_isolation_users_list(self):
        # Faculty can only see own user record
        self._login('faculty.cse@col-a.edu')
        res = self.client.get('/api/v1/auth/users/')
        self.assertEqual(res.status_code, 200)
        results = res.data.get('results') or res.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['email'], 'faculty.cse@col-a.edu')

    def test_faculty_own_profile_view_and_edit(self):
        self._login('faculty.cse@col-a.edu')
        # View own profile
        res = self.client.get('/api/v1/auth/faculty/profile/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['user_email'], 'faculty.cse@col-a.edu')

        # Update own profile permitted fields
        patch_res = self.client.patch('/api/v1/auth/faculty/profile/', {
            'qualification': 'Ph.D. in Computer Science (Gold Medalist)',
            'phone': '+91 9999988888',
            'bio': 'Updated academic profile.'
        })
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.data['qualification'], 'Ph.D. in Computer Science (Gold Medalist)')

    # --- 5. User Management & Department Requirement Tests ---
    def test_user_creation_requires_department_for_faculty(self):
        self._login('admin@test.com')
        # Creating a faculty user WITHOUT department must be rejected
        res = self.client.post('/api/v1/auth/users/', {
            'email': 'new.faculty@col-a.edu',
            'first_name': 'New',
            'last_name': 'Faculty',
            'role': 'FACULTY',
            'college': str(self.college_a.id),
            'password': 'password123',
            'confirm_password': 'password123',
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('department', res.data.get('details', {}) or res.data)

    def test_user_creation_with_valid_department(self):
        self._login('admin@test.com')
        res = self.client.post('/api/v1/auth/users/', {
            'email': 'valid.faculty@col-a.edu',
            'first_name': 'Valid',
            'last_name': 'Faculty',
            'role': 'FACULTY',
            'college': str(self.college_a.id),
            'department': str(self.dept_cse.id),
            'password': 'password123',
            'confirm_password': 'password123',
        })
        self.assertEqual(res.status_code, 201)
        # Verify FacultyProfile was automatically created
        self.assertTrue(FacultyProfile.objects.filter(user__email='valid.faculty@col-a.edu').exists())

    def test_user_activate_and_deactivate(self):
        self._login('admin@test.com')
        user = self.faculty_it
        deact_res = self.client.patch(f'/api/v1/auth/users/{user.id}/deactivate/')
        self.assertEqual(deact_res.status_code, 200)
        user.refresh_from_db()
        self.assertFalse(user.is_active)

        act_res = self.client.patch(f'/api/v1/auth/users/{user.id}/activate/')
        self.assertEqual(act_res.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.is_active)

    # --- 6. Academic Year Switch Active ---
    def test_academic_year_single_active_switch(self):
        self._login('admin@test.com')
        ay_next = AcademicYear.objects.create(
            college=self.college_a, name='2025-26', start_date='2025-07-01', end_date='2026-06-30', is_current=False
        )
        res = self.client.patch(f'/api/v1/academic-years/{ay_next.id}/set-current/')
        self.assertEqual(res.status_code, 200)

        ay_next.refresh_from_db()
        self.ay_a.refresh_from_db()
        self.assertTrue(ay_next.is_current)
        self.assertFalse(self.ay_a.is_current)

    # --- 7. Audit Log Recording ---
    def test_audit_log_created_on_login(self):
        self._login('admin@test.com')
        self.assertTrue(AuditLog.objects.filter(action='LOGIN', actor_email='admin@test.com').exists())
