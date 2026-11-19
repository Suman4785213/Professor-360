from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from django.db import connection, connections
from django.test import TransactionTestCase
from rest_framework.test import APIClient
from apps.activities import tests_phase3 as fixtures
from apps.activities.models import Activity, ActivityStatus
from apps.verification.models import VerificationRecord
from apps.notifications.models import Notification
from apps.evidence.models import Evidence


class ConcurrentVerificationTests(TransactionTestCase):
    setUp = fixtures.Phase3WorkflowTests.setUp

    def race(self, user, url, bodies, **headers):
        self.assertEqual(connection.vendor, 'postgresql')
        self.assertTrue(connection.settings_dict['NAME'].startswith('test_p360_security_'))
        name = connection.settings_dict['NAME']
        barrier = Barrier(len(bodies))
        def send(body):
            try:
                assert connections['default'].settings_dict['NAME'] == name
                client = APIClient()
                client.force_authenticate(user=user)
                barrier.wait(timeout=10)
                return client.post(url, body, format='json', **headers).status_code
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=len(bodies)) as pool:
            return sorted(pool.map(send, bodies))

    def record(self, state):
        activity = Activity.objects.create(college=self.college_a, department=self.dept_cse,
            faculty=self.faculty_1, academic_year=self.ay, category=self.cat_fdp,
            title='Concurrent review', status=state)
        rec = VerificationRecord.objects.create(activity=activity, college=self.college_a, current_status=state)
        return activity, rec

    def test_concurrent_submission(self):
        activity, rec = self.record(ActivityStatus.DRAFT)
        codes = self.race(self.faculty_1, f'/api/v1/activities/{activity.pk}/submit/', [{}, {}])
        self.assertEqual(codes, [200, 400])
        self.assertEqual(rec.logs.count(), 1)
        self.assertEqual(Notification.objects.filter(related_id=activity.pk).count(), 1)

    def test_concurrent_approvals_all_stages(self):
        for state, user, action, final in [
            ('PENDING_INCHARGE', self.incharge_cse, 'incharge-verify', 'PENDING_HOD'),
            ('RETURNED_TO_INCHARGE', self.incharge_cse, 'incharge-verify', 'PENDING_HOD'),
            ('PENDING_HOD', self.hod_cse, 'hod-verify', 'PENDING_IQAC'),
            ('PENDING_IQAC', self.iqac_user, 'iqac-verify', 'VERIFIED_EVIDENCE')]:
            with self.subTest(state=state):
                activity, rec = self.record(state)
                codes = self.race(user, f'/api/v1/verifications/{rec.pk}/{action}/', [{'decision': 'APPROVE'}]*2)
                self.assertEqual(codes, [200, 400])
                activity.refresh_from_db(); rec.refresh_from_db()
                self.assertEqual(activity.status, final)
                self.assertEqual(rec.current_status, final)
                self.assertEqual(rec.logs.count(), 1)
                self.assertEqual(Evidence.objects.filter(activity=activity).count(), int(final == 'VERIFIED_EVIDENCE'))
                notifications = Notification.objects.filter(related_id=activity.pk)
                self.assertEqual(notifications.count(), notifications.values('recipient_id', 'notification_type').distinct().count())

    def test_conflicting_decisions(self):
        activity, rec = self.record(ActivityStatus.PENDING_HOD)
        codes = self.race(self.hod_cse, f'/api/v1/verifications/{rec.pk}/hod-verify/',
                          [{'decision': 'APPROVE'}, {'decision': 'REJECT', 'comment': 'Correction'}])
        self.assertEqual(codes, [200, 400])
        activity.refresh_from_db(); rec.refresh_from_db()
        self.assertEqual(activity.status, rec.current_status)
        self.assertEqual(rec.logs.count(), 1)
        self.assertEqual(rec.logs.get().new_status, activity.status)

    def test_invalid_stage_matrix(self):
        for state in ActivityStatus.values:
            for user, action, allowed in [
                (self.incharge_cse, 'incharge-verify', ['PENDING_INCHARGE', 'RETURNED_TO_INCHARGE']),
                (self.hod_cse, 'hod-verify', ['PENDING_HOD']),
                (self.iqac_user, 'iqac-verify', ['PENDING_IQAC'])]:
                if state in allowed:
                    continue
                activity, rec = self.record(state)
                self.client.force_authenticate(user=user)
                response = self.client.post(f'/api/v1/verifications/{rec.pk}/{action}/', {'decision': 'APPROVE'})
                self.assertEqual(response.status_code, 400)
                self.assertEqual(rec.logs.count(), 0)
                activity.refresh_from_db()
                self.assertEqual(activity.status, state)
