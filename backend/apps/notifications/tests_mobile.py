from django.test import TransactionTestCase
from apps.verification import tests_concurrency as concurrency
from apps.activities import tests_phase3 as fixtures
from apps.notifications.models import Notification, IQACTask, TaskActivity
from apps.accounts.models import User


class MobileNotificationTaskTests(TransactionTestCase):
    race = concurrency.ConcurrentVerificationTests.race
    setUp = fixtures.Phase3WorkflowTests.setUp

    def test_recipient_count_and_preferences(self):
        mine = Notification.objects.create(college=self.college_a, recipient=self.faculty_1, title='Mine')
        foreign = Notification.objects.create(college=self.college_b, recipient=self.faculty_b, title='Foreign')
        self.client.force_authenticate(user=self.faculty_1)
        self.assertEqual(self.client.get('/api/v1/notifications/unread-count/').data['unread_count'], 1)
        self.assertEqual(self.client.post(f'/api/v1/notifications/{foreign.pk}/read/').status_code, 404)
        self.assertEqual(self.client.patch(f'/api/v1/notifications/{mine.pk}/', {'recipient': str(self.faculty_b.pk)}).status_code, 405)
        self.assertEqual(self.client.post(f'/api/v1/notifications/{mine.pk}/read/').status_code, 200)
        self.assertEqual(self.client.post('/api/v1/notifications/mark-all-read/').data['updated_count'], 0)
        self.assertEqual(self.client.get('/api/v1/notifications/unread-count/').data['unread_count'], 0)
        response = self.client.patch('/api/v1/notifications/preferences/', {'category_tasks': False}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(self.client.get('/api/v1/notifications/preferences/').data['category_tasks'])
        foreign.refresh_from_db(); self.assertFalse(foreign.is_read)

    def test_task_assignment_status_comments(self):
        self.client.force_authenticate(user=self.faculty_1)
        url = '/api/v1/tasks/'
        for owner in (self.faculty_2, self.faculty_b):
            self.assertEqual(self.client.post(url, {'title': 'Bad assignment', 'owner': str(owner.pk)}).status_code, 400)
        response = self.client.post(url, {'title': 'Personal task', 'owner': str(self.faculty_1.pk)})
        self.assertEqual(response.status_code, 201, response.data)
        pk = response.data['id']
        base = f'{url}{pk}/'
        self.assertEqual(self.client.post(base+'complete/').status_code, 200)
        count = TaskActivity.objects.filter(task_id=pk).count()
        self.assertEqual(self.client.post(base+'complete/').status_code, 200)
        self.assertEqual(TaskActivity.objects.filter(task_id=pk).count(), count)
        self.assertEqual(self.client.post(base+'start/').status_code, 400)
        self.assertEqual(self.client.post(base+'reopen/').status_code, 200)
        self.assertEqual(self.client.post(base+'comments/', {'comment': 'Progress'}).status_code, 201)
        self.client.force_authenticate(user=self.faculty_b)
        self.assertEqual(self.client.get(base).status_code, 404)
        self.assertEqual(self.client.post(base+'comments/', {'comment': 'Foreign'}).status_code, 404)

    def test_management_read_only(self):
        manager = User.objects.create(email='manager@test.invalid', role='COLLEGE_MANAGEMENT', college=self.college_a)
        task = IQACTask.objects.create(college=self.college_a, owner=self.faculty_1, creator=self.iqac_user, title='Task')
        self.client.force_authenticate(user=manager)
        base = f'/api/v1/tasks/{task.pk}/'
        self.assertEqual(self.client.get(base).status_code, 200)
        self.assertEqual(self.client.delete(base).status_code, 403)
        self.assertEqual(self.client.post(base+'complete/').status_code, 403)
        self.assertEqual(self.client.post(base+'comments/', {'comment': 'No'}).status_code, 403)

    def test_concurrent_completion(self):
        task = IQACTask.objects.create(college=self.college_a, owner=self.faculty_1, creator=self.iqac_user, title='Concurrent task')
        self.assertEqual(self.race(self.faculty_1, f'/api/v1/tasks/{task.pk}/complete/', [{}, {}]), [200, 200])
        self.assertEqual(TaskActivity.objects.filter(task=task).count(), 1)
        self.assertEqual(Notification.objects.filter(related_id=task.pk).count(), 1)

    def test_report_response_retry(self):
        original = Notification.objects.create(college=self.college_a, recipient=self.faculty_1,
            sender=self.incharge_cse, title='Request', notification_type='INCHARGE_REPORT_REQUEST')
        url = f'/api/v1/notifications/{original.pk}/respond-report-request/'
        self.assertEqual(self.race(self.faculty_1, url, [{'response': 'Okay'}]*2), [200, 200])
        self.assertEqual(Notification.objects.filter(notification_type='FACULTY_REPORT_RESPONSE').count(), 1)
