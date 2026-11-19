from django.test import TransactionTestCase, override_settings
from django.core.files.base import ContentFile
from rest_framework.test import APIClient
from apps.accounts.models import User, FacultyProfile
from apps.colleges.models import College
from apps.departments.models import Department
from apps.activities.models import Activity, Document
from apps.reports.models import GeneratedReport, ReportType


class PrivateMediaTests(TransactionTestCase):
    def setUp(self):
        self.client=APIClient()
        self.col=College.objects.create(name='Media A',code='MEDIA-A')
        self.other=College.objects.create(name='Media B',code='MEDIA-B')
        self.dept=Department.objects.create(college=self.col,name='A',code='A')
        self.dept2=Department.objects.create(college=self.col,name='B',code='B')
        self.owner=User.objects.create_user(email='owner@media.edu',password='test-password',college=self.col,department=self.dept,role='FACULTY')
        self.peer=User.objects.create_user(email='peer@media.edu',password='test-password',college=self.col,department=self.dept,role='FACULTY')
        self.hod=User.objects.create_user(email='hod@media.edu',password='test-password',college=self.col,department=self.dept,role='HOD')
        self.outsider=User.objects.create_user(email='outsider@media.edu',password='test-password',college=self.other,role='IQAC')
        activity=Activity.objects.create(college=self.col,department=self.dept,faculty=self.owner,title='Media')
        self.doc=Document.objects.create(college=self.col,department=self.dept,activity=activity,file_name='proof.pdf',file_size=12,mime_type='application/pdf')
        self.doc.file.save('proof.pdf',ContentFile(b'%PDF-1.4 proof'))
        self.profile=FacultyProfile.objects.create(user=self.owner,college=self.col,department=self.dept)
        self.profile.resume.save('resume.pdf',ContentFile(b'%PDF-1.4 resume'))
        kind=ReportType.objects.create(name='Media',code='MEDIA')
        self.report=GeneratedReport.objects.create(college=self.col,department=self.dept,faculty=self.owner,report_type=kind,title='Report',status='COMPLETED')
        self.report.file.save('report.pdf',ContentFile(b'%PDF-1.4 report'))

    @override_settings(DEBUG=True)
    def test_anonymous_direct_paths_denied_even_debug(self):
        for field in (self.doc.file,self.profile.resume,self.report.file):
            self.assertEqual(self.client.get('/media/'+field.name).status_code,401)

    def test_scope_and_existing_files(self):
        for user,expected in [(self.owner,200),(self.peer,404),(self.hod,200),(self.outsider,404)]:
            self.client.force_authenticate(user)
            for field in (self.doc.file,self.profile.resume,self.report.file):
                response=self.client.get('/media/'+field.name)
                self.assertEqual(response.status_code,expected)
                if expected==200:
                    self.assertTrue(b''.join(response.streaming_content).startswith(b'%PDF-'))
                    self.assertEqual(response['Cache-Control'],'private, no-store')
        self.hod.department=self.dept2;self.hod.save()
        self.client.force_authenticate(self.hod)
        self.assertEqual(self.client.get('/media/'+self.doc.file.name).status_code,404)
        self.assertTrue(self.doc.file.storage.exists(self.doc.file.name))

    def test_superadmin_download(self):
        admin=User.objects.create_user(email='admin@media.edu',role='SUPER_ADMIN',password='test-password')
        self.client.force_authenticate(admin)
        response=self.client.get('/media/'+self.profile.resume.name)
        self.assertEqual(response.status_code,200);response.close()

    def test_branding_public_and_unknown_paths_denied(self):
        self.col.logo.save('logo.png',ContentFile(b'branding fixture'))
        response=self.client.get('/media/'+self.col.logo.name)
        self.assertEqual(response.status_code,200);response.close()
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get('/media/unregistered.pdf').status_code,404)
        self.assertEqual(self.client.get('/media/../.env').status_code,404)

    def test_actual_report_download_scoping(self):
        self.client.force_authenticate(self.owner)
        response=self.client.get(f'/api/v1/reports/{self.report.id}/download/')
        self.assertEqual(response.status_code,200);response.close()
        self.report.department=None;self.report.save()
        self.client.force_authenticate(self.hod)
        self.assertEqual(self.client.get(f'/api/v1/reports/{self.report.id}/download/').status_code,404)
        self.client.force_authenticate(self.outsider)
        self.assertEqual(self.client.get(f'/api/v1/reports/{self.report.id}/download/').status_code,404)

    def test_document_api_legitimate_download(self):
        self.client.force_authenticate(self.owner)
        response=self.client.get(f'/api/v1/documents/{self.doc.id}/download/')
        self.assertEqual(response.status_code,200);response.close()
        self.client.force_authenticate(self.peer)
        self.assertEqual(self.client.get(f'/api/v1/documents/{self.doc.id}/download/').status_code,404)

    def test_storage_urls_never_expose_bucket(self):
        from core.storage import PrivateFileSystemStorage
        from core.s3_storage import PrivateS3Storage
        for storage in (PrivateFileSystemStorage(), PrivateS3Storage(bucket_name='fixture-private', access_key='fixture', secret_key='fixture')):
            self.assertEqual(storage.url('faculty/resumes/my resume.pdf'), '/media/faculty/resumes/my%20resume.pdf')

    def test_bad_bearer_and_query_token_cannot_download(self):
        response=self.client.get('/media/'+self.doc.file.name+'?token=not-authorization')
        self.assertEqual(response.status_code,401)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid')
        self.assertEqual(self.client.get('/media/'+self.doc.file.name).status_code,401)
