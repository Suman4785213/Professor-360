from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import User, UserRole


class AuthAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='tester@sitrc.edu',
            password='password123',
            first_name='Test',
            last_name='User',
            role=UserRole.FACULTY
        )

    def test_login_success(self):
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'tester@sitrc.edu',
            'password': 'password123'
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'tester@sitrc.edu')

    def test_login_invalid_password(self):
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'tester@sitrc.edu',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 401)

    def test_me_endpoint_authenticated(self):
        login_res = self.client.post('/api/v1/auth/login/', {
            'email': 'tester@sitrc.edu',
            'password': 'password123'
        })
        token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        me_res = self.client.get('/api/v1/auth/me/')
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.data['email'], 'tester@sitrc.edu')

    def test_college_tenant_login_validation(self):
        from apps.colleges.models import College, CollegeStatus
        c1 = College.objects.create(name='College One', code='C1', status=CollegeStatus.ACTIVE)
        c2 = College.objects.create(name='College Two', code='C2', status=CollegeStatus.ACTIVE)

        user_c1 = User.objects.create_user(
            email='c1_user@c1.edu',
            password='password123',
            role=UserRole.FACULTY,
            college=c1
        )
        super_admin = User.objects.create_user(
            email='admin@sitrc.edu',
            password='password123',
            role=UserRole.SUPER_ADMIN
        )

        # 1. User logging in under their registered college succeeds
        res_ok = self.client.post('/api/v1/auth/login/', {
            'email': 'c1_user@c1.edu',
            'password': 'password123',
            'college_id': str(c1.id)
        })
        self.assertEqual(res_ok.status_code, 200)

        # 2. User attempting to log in under another college fails with 403
        res_cross = self.client.post('/api/v1/auth/login/', {
            'email': 'c1_user@c1.edu',
            'password': 'password123',
            'college_id': str(c2.id)
        })
        self.assertEqual(res_cross.status_code, 403)
        self.assertIn('Access denied', res_cross.data.get('error', res_cross.data.get('detail', '')))

        # 3. Super Admin attempting to log into a college portal fails with 403
        res_sa_college = self.client.post('/api/v1/auth/login/', {
            'email': 'admin@sitrc.edu',
            'password': 'password123',
            'college_id': str(c1.id)
        })
        self.assertEqual(res_sa_college.status_code, 403)

        # 4. Super Admin logging into Super Admin portal succeeds
        res_sa_ok = self.client.post('/api/v1/auth/login/', {
            'email': 'admin@sitrc.edu',
            'password': 'password123',
            'is_super_admin': True
        })
        self.assertEqual(res_sa_ok.status_code, 200)

        # 5. Institutional user attempting to log into Super Admin portal fails with 403
        res_inst_sa = self.client.post('/api/v1/auth/login/', {
            'email': 'c1_user@c1.edu',
            'password': 'password123',
            'is_super_admin': True
        })
        self.assertEqual(res_inst_sa.status_code, 403)

    def test_restricted_faculty_registration(self):
        from apps.colleges.models import College, CollegeStatus
        from apps.departments.models import Department
        c1 = College.objects.create(name='Alpha College', code='ALPHA', status=CollegeStatus.ACTIVE)
        c2 = College.objects.create(name='Beta College', code='BETA', status=CollegeStatus.ACTIVE)
        d1 = Department.objects.create(name='Computer Science', code='CSE', college=c1)

        iqac_user = User.objects.create_user(
            email='iqac@alpha.edu',
            password='password123',
            role=UserRole.IQAC,
            college=c1
        )
        mgmt_user = User.objects.create_user(
            email='mgmt@alpha.edu',
            password='password123',
            role=UserRole.COLLEGE_MANAGEMENT,
            college=c1
        )
        hod_user = User.objects.create_user(
            email='hod@alpha.edu',
            password='password123',
            role=UserRole.HOD,
            college=c1,
            department=d1
        )
        fac_user = User.objects.create_user(
            email='faculty@alpha.edu',
            password='password123',
            role=UserRole.FACULTY,
            college=c1,
            department=d1
        )

        faculty_payload = {
            'college': str(c1.id),
            'department': str(d1.id),
            'first_name': 'New',
            'last_name': 'Professor',
            'email': 'new.prof@alpha.edu',
            'designation': 'Assistant Professor',
            'password': 'password123',
            'confirm_password': 'password123'
        }

        # 1. Anonymous user cannot register faculty -> 401
        self.client.credentials()
        res_anon = self.client.post('/api/v1/auth/register/faculty/', faculty_payload)
        self.assertEqual(res_anon.status_code, 401)

        # 2. HOD cannot register faculty -> 403
        self.client.force_authenticate(user=hod_user)
        res_hod = self.client.post('/api/v1/auth/register/faculty/', faculty_payload)
        self.assertEqual(res_hod.status_code, 403)

        # 3. Regular Faculty cannot register faculty -> 403
        self.client.force_authenticate(user=fac_user)
        res_fac = self.client.post('/api/v1/auth/register/faculty/', faculty_payload)
        self.assertEqual(res_fac.status_code, 403)

        # 4. IQAC Coordinator CAN register faculty for their college -> 201
        self.client.force_authenticate(user=iqac_user)
        res_iqac = self.client.post('/api/v1/auth/register/faculty/', faculty_payload)
        self.assertEqual(res_iqac.status_code, 201)
        self.assertTrue(User.objects.filter(email='new.prof@alpha.edu').exists())

        # 5. College Management CAN register faculty for their college -> 201
        self.client.force_authenticate(user=mgmt_user)
        mgmt_payload = {
            **faculty_payload,
            'email': 'mgmt.prof@alpha.edu',
        }
        res_mgmt = self.client.post('/api/v1/auth/register/faculty/', mgmt_payload)
        self.assertEqual(res_mgmt.status_code, 201)
        self.assertTrue(User.objects.filter(email='mgmt.prof@alpha.edu').exists())

        # 6. IQAC Coordinator attempting to register for another college is denied -> 403
        cross_payload = {
            **faculty_payload,
            'college': str(c2.id),
            'email': 'cross.prof@beta.edu',
        }
        res_cross = self.client.post('/api/v1/auth/register/faculty/', cross_payload)
        self.assertEqual(res_cross.status_code, 403)
