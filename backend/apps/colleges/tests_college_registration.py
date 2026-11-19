import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, UserRole
from apps.colleges.models import College, CollegeStatus, Plan, Subscription, SubscriptionStatus, Invoice, PaymentTransaction
from apps.notifications.models import Notification


class CollegeRegistrationAndFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create active Super Admin
        self.super_admin = User.objects.create(
            email='superadmin@iqac.local',
            first_name='Super',
            last_name='Admin',
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        self.super_admin.set_password('AdminPass123!')
        self.super_admin.save()

        # Create active plan
        self.plan = Plan.objects.create(
            name='Professional Tier',
            code='professional',
            description='Standard college plan',
            price_monthly=Decimal('149.00'),
            price_yearly=Decimal('1490.00'),
            currency='INR',
            is_active=True,
        )

        # Existing active college
        self.active_college = College.objects.create(
            name='Alpha College of Technology',
            short_name='Alpha Tech',
            code='ACT-01',
            status=CollegeStatus.ACTIVE,
            is_active=True,
        )

        # Inactive college (should NEVER appear in search or public list)
        self.inactive_college = College.objects.create(
            name='Beta Suspended Institute',
            short_name='Beta Inst',
            code='BSI-02',
            status=CollegeStatus.SUSPENDED,
            is_active=False,
        )

    def test_public_colleges_active_filter_and_search(self):
        """Verify only active colleges are returned, and search query works."""
        # 1. Without search query
        res = self.client.get('/api/v1/colleges/public/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', [])
        codes = [c['code'] for c in results]
        self.assertIn('ACT-01', codes)
        self.assertNotIn('BSI-02', codes)

        # 2. With matching query
        res_search = self.client.get('/api/v1/colleges/public/?q=Alpha')
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        search_results = res_search.data.get('results', [])
        self.assertEqual(len(search_results), 1)
        self.assertEqual(search_results[0]['code'], 'ACT-01')

        # 3. With query matching inactive college - must return empty
        res_inactive = self.client.get('/api/v1/colleges/public/?q=Beta')
        self.assertEqual(res_inactive.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_inactive.data.get('results', [])), 0)

    def test_new_college_registration_and_subscription_flow(self):
        """Verify only Super Admin can register/onboard new colleges with subscription and payment."""
        payload = {
            'name': 'Cambridge Engineering Academy',
            'code': 'CEA-2026',
            'email': 'contact@cea.edu',
            'phone': '9876543210',
            'city': 'Chennai',
            'state': 'Tamil Nadu',
            'pincode': '600001',
            'accreditation_type': 'NAAC',
            'admin_first_name': 'Robert',
            'admin_last_name': 'Principal',
            'admin_email': 'principal@cea.edu',
            'admin_password': 'SecurePrincipal@123',
            'plan_code': 'professional',
            'billing_cycle': 'YEARLY',
            'payment_method': 'CARD',
            'card_number': '4111222233334444',
        }

        # 1. Anonymous request must be rejected with 401 Unauthorized
        res_anon = self.client.post('/api/v1/colleges/register/', data=payload, format='json')
        self.assertEqual(res_anon.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Regular user (e.g. College Management or Faculty) must be rejected with 403 Forbidden
        regular_user = User.objects.create(
            email='regular@test.edu',
            first_name='Regular',
            last_name='User',
            role=UserRole.FACULTY,
            is_active=True,
        )
        self.client.force_authenticate(user=regular_user)
        res_forbidden = self.client.post('/api/v1/colleges/register/', data=payload, format='json')
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Super Admin authorized request must succeed and provision college with subscription & payment
        self.client.force_authenticate(user=self.super_admin)
        res = self.client.post('/api/v1/colleges/register/', data=payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data.get('success'))

        # Check College created and active
        college = College.objects.get(code='CEA-2026')
        self.assertEqual(college.status, CollegeStatus.ACTIVE)
        self.assertTrue(college.is_active)
        self.assertGreater(college.departments.count(), 0)

        # Check Subscription created
        sub = college.active_subscription
        self.assertIsNotNone(sub)
        self.assertEqual(sub.status, SubscriptionStatus.ACTIVE)
        self.assertEqual(sub.plan.code, 'professional')

        # Check Invoice and Payment
        invoice = sub.invoices.first()
        self.assertIsNotNone(invoice)
        self.assertEqual(invoice.status, 'PAID')

        payment = PaymentTransaction.objects.filter(college=college).first()
        self.assertIsNotNone(payment)
        self.assertEqual(payment.status, 'SUCCESS')

        # Check College Management user created
        admin_user = User.objects.get(email='principal@cea.edu')
        self.assertEqual(admin_user.role, UserRole.COLLEGE_MANAGEMENT)
        self.assertEqual(admin_user.college, college)

        # Check Super Admin received Notification
        sa_notif = Notification.objects.filter(
            recipient=self.super_admin,
            notification_type='NEW_COLLEGE_SUBSCRIPTION',
            college=college
        ).first()
        self.assertIsNotNone(sa_notif)
        self.assertIn('Cambridge Engineering Academy', sa_notif.title)
        self.assertIn('Professional Tier', sa_notif.body)
        self.assertIn('Active', sa_notif.body)

    def test_college_registration_payment_failure(self):
        """Verify registration fails and no college is created if payment is declined under Super Admin."""
        self.client.force_authenticate(user=self.super_admin)
        payload = {
            'name': 'Failing College',
            'code': 'FAIL-01',
            'email': 'info@fail.edu',
            'phone': '1234567890',
            'admin_first_name': 'Test',
            'admin_last_name': 'Admin',
            'admin_email': 'admin@fail.edu',
            'admin_password': 'SecureAdmin@123',
            'plan_code': 'professional',
            'simulate_failure': True,
        }

        res = self.client.post('/api/v1/colleges/register/', data=payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertFalse(College.objects.filter(code='FAIL-01').exists())
        self.assertFalse(User.objects.filter(email='admin@fail.edu').exists())
