import io
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.colleges.models import College
from apps.departments.models import Department
from apps.accounts.models import User, UserRole
from apps.notifications.models import Notification, NotificationCategory, NotificationPriority
from apps.reports.models import ReportType, GeneratedReport, ReportFormat, ReportStatus


class InchargeWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # College
        self.college = College.objects.create(name="Test Engineering College", code="TEST-ENG")
        self.college_other = College.objects.create(name="Other College", code="OTHER-ENG")

        # Departments
        self.dept_cse = Department.objects.create(name="Computer Science and Engineering", code="CSE", college=self.college)
        self.dept_ece = Department.objects.create(name="Electronics and Communication", code="ECE", college=self.college)

        # In-charge CSE
        self.incharge_cse = User.objects.create_user(
            email="incharge.cse@test.edu",
            password="password123",
            first_name="Vikram",
            last_name="Joshi",
            role=UserRole.DEPARTMENT_INCHARGE,
            college=self.college,
            department=self.dept_cse,
        )

        # Faculty CSE
        self.faculty_cse = User.objects.create_user(
            email="faculty.cse@test.edu",
            password="password123",
            first_name="Rahul",
            last_name="Kulkarni",
            role=UserRole.FACULTY,
            college=self.college,
            department=self.dept_cse,
        )

        # Faculty ECE (Different Department)
        self.faculty_ece = User.objects.create_user(
            email="faculty.ece@test.edu",
            password="password123",
            first_name="Anand",
            last_name="Verma",
            role=UserRole.FACULTY,
            college=self.college,
            department=self.dept_ece,
        )

        # HOD CSE
        self.hod_cse = User.objects.create_user(
            email="hod.cse@test.edu",
            password="password123",
            first_name="Anita",
            last_name="Deshmukh",
            role=UserRole.HOD,
            college=self.college,
            department=self.dept_cse,
        )

        # Report Type
        self.report_type = ReportType.objects.create(
            name="Faculty Summary Report",
            code="FACULTY_PROFILE",
            college=self.college,
        )

    def test_send_report_request_success(self):
        self.client.force_authenticate(user=self.incharge_cse)
        res = self.client.post('/api/v1/notifications/send-report-request/', {
            'faculty_id': str(self.faculty_cse.id),
            'message': 'Please submit your activity report.',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['category'], NotificationCategory.REPORT)

        # Check notification created in DB
        notif = Notification.objects.filter(recipient=self.faculty_cse, sender=self.incharge_cse).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.metadata['request_type'], 'REPORT_REQUEST')
        self.assertEqual(notif.metadata['response_options'], ['Okay', 'Done', 'No'])

    def test_send_report_request_department_isolation_enforced(self):
        # Incharge CSE attempts to send request to Faculty ECE -> must be rejected
        self.client.force_authenticate(user=self.incharge_cse)
        res = self.client.post('/api/v1/notifications/send-report-request/', {
            'faculty_id': str(self.faculty_ece.id),
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('isolation', res.data['error'].lower())

    def test_faculty_respond_report_request(self):
        # 1. Send request
        self.client.force_authenticate(user=self.incharge_cse)
        create_res = self.client.post('/api/v1/notifications/send-report-request/', {
            'faculty_id': str(self.faculty_cse.id),
        })
        notif_id = create_res.data['id']

        # 2. Faculty responds 'Okay'
        self.client.force_authenticate(user=self.faculty_cse)
        res = self.client.post(f'/api/v1/notifications/{notif_id}/respond-report-request/', {
            'response': 'Okay',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['response'], 'Okay')
        self.assertEqual(res.data['response_text'], 'Let me submit it soon.')

        # 3. Verify In-charge received response notification
        resp_notif = Notification.objects.filter(recipient=self.incharge_cse, sender=self.faculty_cse).first()
        self.assertIsNotNone(resp_notif)
        self.assertEqual(resp_notif.metadata['response'], 'Okay')
        self.assertIn('Let me submit it soon', resp_notif.body)

    def test_incharge_download_faculty_report_and_merge_and_submit_hod(self):
        self.client.force_authenticate(user=self.incharge_cse)

        # 1. Download faculty report
        dl_res = self.client.post('/api/v1/reports/incharge-faculty-report/', {
            'faculty_id': str(self.faculty_cse.id),
        })
        self.assertEqual(dl_res.status_code, status.HTTP_201_CREATED)
        report_id = dl_res.data['id']

        # 2. List stored reports
        stored_res = self.client.get('/api/v1/reports/incharge-stored-reports/')
        self.assertEqual(stored_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(stored_res.data['results']), 1)

        # 3. Merge reports
        merge_res = self.client.post('/api/v1/reports/merge-reports/', {
            'report_ids': [report_id],
        }, format='json')
        self.assertEqual(merge_res.status_code, status.HTTP_201_CREATED)
        merged_id = merge_res.data['id']

        # 4. Submit to HOD
        submit_res = self.client.post(f'/api/v1/reports/{merged_id}/submit-to-hod/')
        self.assertEqual(submit_res.status_code, status.HTTP_200_OK)
        self.assertIn('successfully submitted', submit_res.data['message'])

        # 5. Check HOD notification created
        hod_notif = Notification.objects.filter(recipient=self.hod_cse, notification_type='HOD_REPORT_SUBMISSION').first()
        self.assertIsNotNone(hod_notif)
        self.assertIn('Vikram Joshi', hod_notif.body)
