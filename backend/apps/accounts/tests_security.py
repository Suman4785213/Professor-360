import hashlib
from urllib.parse import urlparse, parse_qs
from unittest.mock import patch
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from apps.accounts.models import User, PasswordResetToken
from apps.colleges.models import College
from apps.departments.models import Department
from apps.activities.models import Activity, Document
from apps.criteria.models import Criterion, Metric, EvidenceRequirement
from apps.evidence.models import Evidence


class SecurityRegressionTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.a = College.objects.create(name='A', code='A')
        self.b = College.objects.create(name='B', code='B')
        self.da = Department.objects.create(college=self.a, name='A', code='A')
        self.db = Department.objects.create(college=self.b, name='B', code='B')
        self.users = {}
        for role in ['SUPER_ADMIN', 'COLLEGE_MANAGEMENT', 'IQAC', 'HOD', 'DEPARTMENT_INCHARGE', 'FACULTY']:
            self.users[role] = User.objects.create_user(email=role+'@example.edu', password='password123',
                first_name=role, last_name='Test', role=role,
                college=None if role == 'SUPER_ADMIN' else self.a,
                department=self.da if role in ('HOD', 'DEPARTMENT_INCHARGE', 'FACULTY') else None)
        self.fac = self.users['FACULTY']
        self.other = User.objects.create_user(email='other@example.edu', password='password123',
            role='FACULTY', college=self.b, department=self.db)
        self.act = Activity.objects.create(college=self.a, department=self.da, faculty=self.fac, title='Draft')
        self.foreign = Activity.objects.create(college=self.b, department=self.db, faculty=self.other, title='Private')
        self.doc = Document.objects.create(activity=self.foreign, college=self.b, department=self.db,
            file='private.pdf', file_name='private.pdf', file_size=10, mime_type='application/pdf')

    def as_role(self, role):
        self.client.force_authenticate(self.users[role])

    def test_self_privileged_fields_rejected(self):
        for role in self.users:
            self.as_role(role)
            for field, value in {'role':'SUPER_ADMIN', 'college':str(self.b.id), 'department':str(self.db.id),
                    'is_active':False, 'is_staff':True, 'is_superuser':True, 'groups':[], 'user_permissions':[]}.items():
                for method in ('patch', 'put'):
                    with self.subTest(role=role, field=field, method=method):
                        r = getattr(self.client, method)('/api/v1/auth/me/', {field:value}, format='json')
                        self.assertEqual(r.status_code, 400)
            self.users[role].refresh_from_db()
            self.assertEqual(self.users[role].role, role)

    def test_legitimate_personal_edit(self):
        self.as_role('FACULTY')
        self.assertEqual(self.client.patch('/api/v1/auth/me/', {'phone':'12345'}).status_code, 200)
        self.fac.refresh_from_db()
        self.assertEqual(self.fac.phone, '12345')

    def test_faculty_profile_department_rejected(self):
        self.as_role('FACULTY')
        self.assertEqual(self.client.patch('/api/v1/auth/faculty/profile/', {'department':str(self.db.id)}).status_code,400)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', PASSWORD_RESET_URL='https://example.invalid/reset')
    def test_reset_private_hashed_single_use(self):
        r = self.client.post('/api/v1/auth/forgot-password/', {'email':self.fac.email})
        missing = self.client.post('/api/v1/auth/forgot-password/', {'email':'absent@example.edu'})
        self.assertEqual(r.data, missing.data)
        self.assertNotIn('reset_token', r.data)
        raw = parse_qs(urlparse(mail.outbox[-1].body.split()[-1]).fragment)['token'][0]
        self.assertTrue(PasswordResetToken.objects.filter(token=hashlib.sha256(raw.encode()).hexdigest()).exists())
        self.assertFalse(PasswordResetToken.objects.filter(token=raw).exists())
        payload = {'token':raw,'new_password':'NewPass123!', 'confirm_password':'NewPass123!'}
        self.assertEqual(self.client.post('/api/v1/auth/reset-password/',payload).status_code,200)
        self.assertEqual(self.client.post('/api/v1/auth/reset-password/',payload).status_code,400)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend')
    def test_reset_unavailable_no_token_created(self):
        with patch('apps.accounts.views.send_mail') as send:
            self.assertEqual(self.client.post('/api/v1/auth/forgot-password/', {'email':self.fac.email}).status_code,200)
            send.assert_not_called()
        self.assertEqual(PasswordResetToken.objects.count(),0)

    def test_reset_throttling(self):
        for _ in range(5):
            self.assertEqual(self.client.post('/api/v1/auth/forgot-password/', {'email':'absent@example.edu'}).status_code,200)
        self.assertEqual(self.client.post('/api/v1/auth/forgot-password/', {'email':'absent@example.edu'}).status_code,429)

    def test_iqac_creation_boundaries(self):
        self.as_role('IQAC')
        payload = {'email':'new@example.edu','first_name':'New','last_name':'User', 'password':'password123',
                   'confirm_password':'password123', 'department':str(self.da.id), 'college':str(self.a.id)}
        for role in ('SUPER_ADMIN','IQAC','COLLEGE_MANAGEMENT'):
            self.assertEqual(self.client.post('/api/v1/auth/users/',dict(payload,role=role)).status_code,400)
        self.assertEqual(self.client.post('/api/v1/auth/users/',dict(payload,role='FACULTY',college=str(self.b.id),department=str(self.db.id))).status_code,400)
        self.assertEqual(self.client.post('/api/v1/auth/users/',dict(payload,role='FACULTY')).status_code,201)

    def test_iqac_cannot_promote_or_edit_admin(self):
        self.as_role('IQAC')
        self.assertEqual(self.client.patch(f'/api/v1/auth/users/{self.fac.id}/',{'role':'SUPER_ADMIN'}).status_code,400)
        self.assertEqual(self.client.patch(f"/api/v1/auth/users/{self.users['COLLEGE_MANAGEMENT'].id}/deactivate/").status_code,403)

    def test_cross_college_reads_and_downloads(self):
        evidence = Evidence.objects.create(college=self.b, department=self.db, faculty=self.other, activity=self.foreign, title='Private')
        for role in ('FACULTY','HOD','DEPARTMENT_INCHARGE','IQAC','COLLEGE_MANAGEMENT'):
            self.as_role(role)
            for path in [f'activities/{self.foreign.id}/',f'documents/{self.doc.id}/download/',
                         f'documents/{self.doc.id}/preview/',f'evidence/{evidence.id}/',f'auth/users/{self.other.id}/']:
                self.assertEqual(self.client.get('/api/v1/'+path).status_code,404)
        self.as_role('SUPER_ADMIN')
        self.assertEqual(self.client.get(f'/api/v1/activities/{self.foreign.id}/').status_code,200)

    def test_unauthorized_upload(self):
        self.as_role('FACULTY')
        r=self.client.post('/api/v1/documents/',{'activity':str(self.foreign.id),'file_name':'x.pdf',
            'file':SimpleUploadedFile('x.pdf',b'%PDF-1.4 test',content_type='application/pdf')},format='multipart')
        self.assertEqual(r.status_code,400)
        self.assertEqual(Document.objects.count(),1)

    def test_evidence_requirement_isolation(self):
        criterion=Criterion.objects.create(college=self.b,number='1',title='Private')
        metric=Metric.objects.create(college=self.b,criterion=criterion,number='1.1',title='Private')
        requirement=EvidenceRequirement.objects.create(metric=metric,name='Private')
        self.as_role('IQAC')
        self.assertEqual(self.client.get(f'/api/v1/evidence-requirements/{requirement.id}/').status_code,404)
        self.assertEqual(self.client.post('/api/v1/evidence-requirements/',{'metric':str(metric.id),'name':'Bad'}).status_code,400)

    def test_deletion_draft_owner_only(self):
        self.as_role('FACULTY')
        for state in ('PENDING_INCHARGE','PENDING_HOD','PENDING_IQAC','VERIFIED_EVIDENCE'):
            self.act.status=state;self.act.save()
            self.assertEqual(self.client.delete(f'/api/v1/activities/{self.act.id}/').status_code,403)
        self.act.status='DRAFT';self.act.save()
        self.as_role('IQAC')
        self.assertEqual(self.client.delete(f'/api/v1/activities/{self.act.id}/').status_code,403)
        self.as_role('FACULTY')
        self.assertEqual(self.client.delete(f'/api/v1/activities/{self.foreign.id}/').status_code,404)
        self.assertEqual(self.client.delete(f'/api/v1/activities/{self.act.id}/').status_code,204)

    def test_all_six_roles_login_and_refresh_rotation(self):
        for role,user in self.users.items():
            r=self.client.post('/api/v1/auth/login/',{'email':user.email,'password':'password123'})
            self.assertEqual(r.status_code,200)
            old=r.data['refresh']
            refreshed=self.client.post('/api/v1/auth/refresh/',{'refresh':old})
            self.assertEqual(refreshed.status_code,200)
            self.assertNotEqual(refreshed.data['refresh'],old)
            self.assertEqual(self.client.post('/api/v1/auth/refresh/',{'refresh':old}).status_code,401)

    def test_faculty_registration_roles(self):
        for role in self.users:
            self.as_role(role)
            payload={'email':role+'new@example.edu','first_name':'New','last_name':'Faculty','college':str(self.a.id),
                     'department':str(self.da.id),'password':'password123','confirm_password':'password123'}
            self.assertEqual(self.client.post('/api/v1/auth/register/faculty/',payload).status_code,
                             201 if role in ('IQAC','COLLEGE_MANAGEMENT') else 403)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', PASSWORD_RESET_URL='https://example.invalid/reset')
    def test_expired_reset_rejected(self):
        from django.utils import timezone
        from datetime import timedelta
        self.client.post('/api/v1/auth/forgot-password/', {'email':self.fac.email})
        raw=parse_qs(urlparse(mail.outbox[-1].body.split()[-1]).fragment)['token'][0]
        PasswordResetToken.objects.update(expires_at=timezone.now()-timedelta(seconds=1))
        self.assertEqual(self.client.post('/api/v1/auth/reset-password/',
            {'token':raw,'new_password':'NewPass123!','confirm_password':'NewPass123!'}).status_code,400)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', PASSWORD_RESET_URL='https://example.invalid/reset')
    def test_email_failure_invalidates_token(self):
        with patch('apps.accounts.views.send_mail',side_effect=RuntimeError('delivery failed')):
            r=self.client.post('/api/v1/auth/forgot-password/', {'email':self.fac.email})
        self.assertEqual(r.status_code,200)
        self.assertNotIn('reset_token',r.data)
        self.assertTrue(PasswordResetToken.objects.get().is_used)

    def test_departmentless_staff_fail_closed(self):
        user=self.users['HOD'];user.department=None;user.save()
        self.as_role('HOD')
        for path in ('activities/','documents/','auth/users/','auth/faculty/profiles/'):
            r=self.client.get('/api/v1/'+path)
            self.assertEqual(r.status_code,200)
            self.assertEqual(r.data['count'],0)

    def test_same_college_other_department_isolation(self):
        dept=Department.objects.create(college=self.a,name='Second',code='SECOND')
        other=User.objects.create_user(email='second@example.edu',password='password123',role='FACULTY',college=self.a,department=dept)
        act=Activity.objects.create(college=self.a,department=dept,faculty=other,title='Private')
        self.as_role('HOD')
        self.assertEqual(self.client.get(f'/api/v1/activities/{act.id}/').status_code,404)
        self.as_role('FACULTY')
        self.assertEqual(self.client.patch(f'/api/v1/activities/{act.id}/',{'title':'Changed'}).status_code,404)

    def test_report_access_and_foreign_filters(self):
        from apps.reports.models import GeneratedReport, ReportType
        report_type=ReportType.objects.create(name='Global',code='GLOBAL')
        foreign_type=ReportType.objects.create(college=self.b,name='Foreign',code='FOREIGN')
        report=GeneratedReport.objects.create(college=self.a,report_type=report_type,title='College-wide',status='COMPLETED')
        self.as_role('HOD')
        self.assertEqual(self.client.get(f'/api/v1/reports/{report.id}/download/').status_code,404)
        self.as_role('IQAC')
        self.assertEqual(self.client.post('/api/v1/reports/preview/',{'report_type':str(foreign_type.id)}).status_code,400)
        self.assertEqual(self.client.post('/api/v1/reports/preview/',{'report_type':str(report_type.id),'department':str(self.db.id)}).status_code,400)

    def test_shared_catalog_cannot_be_modified_by_iqac(self):
        from apps.activities.models import ActivityCategory
        category=ActivityCategory.objects.create(name='Global',code='GLOBAL')
        self.as_role('IQAC')
        self.assertEqual(self.client.patch(f'/api/v1/activity-categories/{category.id}/',{'name':'Hijacked'}).status_code,403)
        self.as_role('SUPER_ADMIN')
        self.assertEqual(self.client.patch(f'/api/v1/activity-categories/{category.id}/',{'name':'Updated'}).status_code,200)

    def test_activity_foreign_relationship_rejected(self):
        from apps.academic_years.models import AcademicYear
        year=AcademicYear.objects.create(college=self.b,name='2026',start_date='2026-01-01',end_date='2026-12-31')
        self.as_role('FACULTY')
        self.assertEqual(self.client.patch(f'/api/v1/activities/{self.act.id}/',{'academic_year':str(year.id)}).status_code,400)

    def test_document_reassignment_and_verified_mutation_rejected(self):
        doc=Document.objects.create(activity=self.act,college=self.a,department=self.da,file='own.pdf',file_name='own.pdf',file_size=10,mime_type='application/pdf')
        self.as_role('FACULTY')
        self.assertEqual(self.client.patch(f'/api/v1/documents/{doc.id}/',{'activity':str(self.foreign.id)}).status_code,400)
        self.act.status='VERIFIED_EVIDENCE';self.act.save()
        self.assertEqual(self.client.patch(f'/api/v1/documents/{doc.id}/',{'description':'Changed'}).status_code,400)
        self.assertEqual(self.client.delete(f'/api/v1/documents/{doc.id}/').status_code,403)

    def test_report_catalog_creation_scoped(self):
        from apps.reports.models import ReportType
        self.as_role('IQAC')
        r=self.client.post('/api/v1/report-types/',{'name':'Own','code':'OWN'})
        self.assertEqual(r.status_code,201)
        self.assertEqual(ReportType.objects.get(pk=r.data['id']).college_id,self.a.id)
        self.assertEqual(self.client.post('/api/v1/report-types/',{'name':'Other','code':'OTHER','college':str(self.b.id)}).status_code,400)

    def test_invalid_reset_token_rejected(self):
        r=self.client.post('/api/v1/auth/reset-password/',{'token':'invalid','new_password':'NewPassword123!','confirm_password':'NewPassword123!'})
        self.assertEqual(r.status_code,400)
        self.fac.refresh_from_db()
        self.assertTrue(self.fac.check_password('password123'))
