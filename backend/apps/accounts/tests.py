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
