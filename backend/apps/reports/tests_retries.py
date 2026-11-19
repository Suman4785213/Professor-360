from django.test import TransactionTestCase
from rest_framework.test import APIClient
from apps.reports import tests_hod as fixtures
from apps.verification import tests_concurrency as concurrency
from apps.notifications.models import Notification
from apps.reports.models import GeneratedReport


class ReportRetryTests(TransactionTestCase):
    setUp = fixtures.HODWorkflowAndIsolationTestCase.setUp
    race = concurrency.ConcurrentVerificationTests.race

    def test_handoff_retries(self):
        self.report_cse.filters_applied = {}
        self.report_cse.save()
        for user, action in [(self.incharge_cse, 'submit-to-hod'), (self.hod_cse, 'hod-download'), (self.hod_cse, 'submit-to-admins')]:
            url = f'/api/v1/reports/{self.report_cse.pk}/{action}/'
            self.assertEqual(self.race(user, url, [{}, {}]), [200, 200])
            self.report_cse.refresh_from_db()
            metadata = self.report_cse.filters_applied.copy()
            count = Notification.objects.count()
            client = APIClient(); client.force_authenticate(user=user)
            self.assertEqual(client.post(url).status_code, 200)
            self.report_cse.refresh_from_db()
            self.assertEqual(metadata, self.report_cse.filters_applied)
            self.assertEqual(count, Notification.objects.count())
        self.assertEqual(Notification.objects.filter(notification_type='HOD_REPORT_SUBMISSION').count(), 1)
        self.assertEqual(Notification.objects.filter(notification_type='HOD_ADMIN_REPORT_SUBMISSION').count(), 2)

    def test_generation_key_and_conflict(self):
        client = APIClient(); client.force_authenticate(user=self.iqac_user)
        body = {'report_type': str(self.report_type.pk), 'output_format': 'PDF'}
        url = '/api/v1/reports/generate/'
        first = client.post(url, body, format='json', HTTP_IDEMPOTENCY_KEY='generation-one')
        self.assertEqual(first.status_code, 201, first.data)
        count = GeneratedReport.objects.count()
        retry = client.post(url, body, format='json', HTTP_IDEMPOTENCY_KEY='generation-one')
        self.assertEqual(retry.status_code, 201, retry.data)
        self.assertEqual(str(first.data['id']), str(retry.data['id']))
        self.assertEqual(GeneratedReport.objects.count(), count)
        body['output_format'] = 'EXCEL'
        self.assertEqual(client.post(url, body, format='json', HTTP_IDEMPOTENCY_KEY='generation-one').status_code, 409)

    def test_merge_retry(self):
        import io
        from pypdf import PdfWriter
        from django.core.files.base import ContentFile
        writer = PdfWriter(); writer.add_blank_page(width=100, height=100)
        buffer = io.BytesIO(); writer.write(buffer)
        self.report_cse.file.save('valid.pdf', ContentFile(buffer.getvalue()))
        client = APIClient(); client.force_authenticate(user=self.incharge_cse)
        body = {'report_ids': [str(self.report_cse.pk)]}
        first = client.post('/api/v1/reports/merge-reports/', body, format='json', HTTP_IDEMPOTENCY_KEY='merge-one')
        self.assertEqual(first.status_code, 201, first.data)
        count = GeneratedReport.objects.count()
        second = client.post('/api/v1/reports/merge-reports/', body, format='json', HTTP_IDEMPOTENCY_KEY='merge-one')
        self.assertEqual(second.json(), first.json())
        self.assertEqual(count, GeneratedReport.objects.count())
        body['report_ids'].append(str(self.report_it.pk))
        self.assertEqual(client.post('/api/v1/reports/merge-reports/', body, format='json', HTTP_IDEMPOTENCY_KEY='merge-one').status_code, 409)

    def test_handoff_department_denial(self):
        client = APIClient(); client.force_authenticate(user=self.hod_it)
        for action in ('hod-download', 'submit-to-admins'):
            self.assertEqual(client.post(f'/api/v1/reports/{self.report_cse.pk}/{action}/').status_code, 403)
        self.assertEqual(Notification.objects.count(), 0)

    def test_concurrent_generation_key(self):
        body = {'report_type': str(self.report_type.pk), 'output_format': 'PDF'}
        before = GeneratedReport.objects.count()
        self.assertEqual(self.race(self.iqac_user, '/api/v1/reports/generate/', [body, body], HTTP_IDEMPOTENCY_KEY='concurrent-generation'), [201, 201])
        self.assertEqual(GeneratedReport.objects.count(), before + 1)
