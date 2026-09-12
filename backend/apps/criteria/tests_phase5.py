"""
Automated unit test suite for Phase 5:
IQAC Criteria, Metrics & Evidence Mapping
"""
import uuid
import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.colleges.models import College
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.accounts.models import User, UserRole
from apps.activities.models import Activity, ActivityCategory, ActivityType, ActivityStatus, Document, DocumentCategory
from apps.evidence.models import Evidence
from apps.criteria.models import Framework, Criterion, Metric, EvidenceRequirement, EvidenceMapping


class Phase5CriteriaAndMappingTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Colleges (Multi-tenant)
        self.college_a = College.objects.create(name="Apex Engineering College", code="APEX")
        self.college_b = College.objects.create(name="Zenith University", code="ZENITH")

        # 2. Departments
        self.dept_cse = Department.objects.create(college=self.college_a, name="Computer Science", code="CSE")
        self.dept_it = Department.objects.create(college=self.college_a, name="Information Tech", code="IT")
        self.dept_b = Department.objects.create(college=self.college_b, name="Zenith CSE", code="ZCSE")

        # 3. Academic Year
        self.ay = AcademicYear.objects.create(
            college=self.college_a,
            name="2025-26",
            start_date=datetime.date(2025, 7, 1),
            end_date=datetime.date(2026, 6, 30),
            is_current=True
        )

        # 4. Users
        self.iqac_user = User.objects.create_user(
            email="iqac@apex.edu", password="password123", college=self.college_a, role=UserRole.IQAC
        )
        self.hod_user = User.objects.create_user(
            email="hod@apex.edu", password="password123", college=self.college_a, department=self.dept_cse, role=UserRole.HOD
        )
        self.incharge_user = User.objects.create_user(
            email="incharge@apex.edu", password="password123", college=self.college_a, department=self.dept_cse, role=UserRole.DEPARTMENT_INCHARGE
        )
        self.faculty_user = User.objects.create_user(
            email="faculty@apex.edu", password="password123", college=self.college_a, department=self.dept_cse, role=UserRole.FACULTY, employee_id="EMP-101"
        )
        self.mgmt_user = User.objects.create_user(
            email="mgmt@apex.edu", password="password123", college=self.college_a, role=UserRole.COLLEGE_MANAGEMENT
        )
        self.college_b_user = User.objects.create_user(
            email="iqac@zenith.edu", password="password123", college=self.college_b, role=UserRole.IQAC
        )

        # 5. Framework, Criterion, Metric
        self.framework = Framework.objects.create(
            college=self.college_a,
            name="Apex Quality Framework 2026",
            code="AQF_2026",
            version="2026.1"
        )
        self.crit_1 = Criterion.objects.create(
            college=self.college_a,
            framework_ref=self.framework,
            framework="AQF_2026",
            number="1",
            title="Curricular Aspects",
            description="Curriculum development and enrichment",
            weightage=100,
            display_order=1
        )
        self.crit_2 = Criterion.objects.create(
            college=self.college_a,
            framework_ref=self.framework,
            framework="AQF_2026",
            number="2",
            title="Teaching-Learning and Evaluation",
            description="Faculty profile and pedagogical delivery",
            weightage=350,
            display_order=2
        )

        self.metric_242 = Metric.objects.create(
            college=self.college_a,
            criterion=self.crit_2,
            number="2.4.2",
            title="Faculty Development Program (FDP) Participation",
            description="Faculty undergoing online/face-to-face FDPs",
            weightage=50,
            benchmark_count=5,
            display_order=1
        )
        self.metric_231 = Metric.objects.create(
            college=self.college_a,
            criterion=self.crit_2,
            number="2.3.1",
            title="Student-Centric Participatory Learning",
            description="Experiential methodologies in classroom delivery",
            weightage=30,
            benchmark_count=3,
            display_order=2
        )

        # 6. Activity Categories
        self.cat_fdp = ActivityCategory.objects.create(name="FDP", code="FDP", college=self.college_a)
        self.cat_sem = ActivityCategory.objects.create(name="Seminar", code="SEMINAR", college=self.college_a)

        # 7. Verified Evidence Record
        self.act_verified = Activity.objects.create(
            college=self.college_a,
            department=self.dept_cse,
            faculty=self.faculty_user,
            academic_year=self.ay,
            title="5-Day FDP on Deep Learning & Transformers",
            category=self.cat_fdp,
            activity_type=ActivityType.FDP,
            status=ActivityStatus.VERIFIED_EVIDENCE
        )
        self.evidence_verified = Evidence.objects.create(
            college=self.college_a,
            department=self.dept_cse,
            faculty=self.faculty_user,
            activity=self.act_verified,
            academic_year=self.ay,
            title=self.act_verified.title,
            category="FDP",
            is_verified=True,
            status='ACTIVE',
            verified_at=timezone.now()
        )

        # 8. Unverified Activity (Draft)
        self.act_draft = Activity.objects.create(
            college=self.college_a,
            department=self.dept_cse,
            faculty=self.faculty_user,
            academic_year=self.ay,
            title="Draft Seminar Notes (Unverified)",
            category=self.cat_sem,
            activity_type=ActivityType.SEMINAR,
            status=ActivityStatus.DRAFT
        )

    def test_framework_and_criteria_creation(self):
        """Framework and Criteria can be created and queried."""
        self.client.force_authenticate(user=self.iqac_user)
        res = self.client.get("/api/frameworks/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertTrue(len(results) >= 1)

        crit_res = self.client.get("/api/criteria/")
        self.assertEqual(crit_res.status_code, status.HTTP_200_OK)
        crit_results = crit_res.data.get('results', crit_res.data)
        self.assertEqual(len(crit_results), 2)

    def test_iqac_can_map_verified_evidence(self):
        """IQAC user can successfully map a verified evidence record to a metric."""
        self.client.force_authenticate(user=self.iqac_user)
        payload = {
            "metric": str(self.metric_242.id),
            "evidence": str(self.evidence_verified.id),
            "notes": "Official FDP certification proof for Criterion 2."
        }
        res = self.client.post("/api/evidence-mappings/", payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['metric_number'], "2.4.2")
        self.assertEqual(res.data['criterion_number'], "2")
        self.assertEqual(res.data['status'], "ACTIVE")
        self.assertEqual(EvidenceMapping.objects.filter(metric=self.metric_242, status='ACTIVE').count(), 1)

    def test_unverified_evidence_cannot_be_mapped(self):
        """Attempting to map an unverified activity or draft raises validation error (Rule 2 & Section 28)."""
        self.client.force_authenticate(user=self.iqac_user)
        # Attempting to map draft activity ID directly as evidence should fail
        payload = {
            "metric": str(self.metric_242.id),
            "evidence": str(self.act_draft.id),
            "notes": "Invalid unverified mapping"
        }
        res = self.client.post("/api/evidence-mappings/", payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_college_mapping_blocked(self):
        """Attempting to map evidence to a metric belonging to another college is blocked."""
        self.client.force_authenticate(user=self.college_b_user)
        # College B user attempts to map College A evidence
        payload = {
            "metric": str(self.metric_242.id),
            "evidence": str(self.evidence_verified.id),
            "notes": "Cross-college breach attempt"
        }
        res = self.client.post("/api/evidence-mappings/", payload, format='json')
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_non_iqac_cannot_create_mapping(self):
        """Faculty, HOD, In-charge, and Management cannot create official evidence mappings (Rule 1 & Rule 6)."""
        for user in [self.faculty_user, self.incharge_user, self.hod_user, self.mgmt_user]:
            self.client.force_authenticate(user=user)
            payload = {
                "metric": str(self.metric_242.id),
                "evidence": str(self.evidence_verified.id),
                "notes": "Unauthorized mapping attempt"
            }
            res = self.client.post("/api/evidence-mappings/", payload, format='json')
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN, f"User {user.email} should be denied mapping permission.")

    def test_multiple_metrics_same_evidence(self):
        """One verified evidence record can be mapped to multiple metrics without document duplication (Rule 3 & Rule 4)."""
        self.client.force_authenticate(user=self.iqac_user)
        # Map to Metric 2.4.2
        res1 = self.client.post("/api/evidence-mappings/", {
            "metric": str(self.metric_242.id),
            "evidence": str(self.evidence_verified.id),
            "notes": "Primary FDP Pedagogical Mapping"
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Map same evidence to Metric 2.3.1
        res2 = self.client.post("/api/evidence-mappings/", {
            "metric": str(self.metric_231.id),
            "evidence": str(self.evidence_verified.id),
            "notes": "Also supports Participatory Learning Methodologies"
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        # Confirm 2 distinct mappings exist for the 1 original evidence record
        self.assertEqual(EvidenceMapping.objects.filter(evidence=self.evidence_verified, status='ACTIVE').count(), 2)
        # Evidence record remains single instance
        self.assertEqual(Evidence.objects.filter(id=self.evidence_verified.id).count(), 1)

    def test_duplicate_mapping_prevented(self):
        """Mapping the exact same evidence to the same metric twice returns a validation error."""
        self.client.force_authenticate(user=self.iqac_user)
        payload = {
            "metric": str(self.metric_242.id),
            "evidence": str(self.evidence_verified.id),
            "notes": "Initial mapping"
        }
        res1 = self.client.post("/api/evidence-mappings/", payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Second attempt
        res2 = self.client.post("/api/evidence-mappings/", payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_archive_and_restore_mapping(self):
        """Archiving an evidence mapping preserves audit history, hides it from active view, and can be restored."""
        self.client.force_authenticate(user=self.iqac_user)
        map_res = self.client.post("/api/evidence-mappings/", {
            "metric": str(self.metric_242.id),
            "evidence": str(self.evidence_verified.id),
            "notes": "Mapping to be archived"
        }, format='json')
        mapping_id = map_res.data['id']

        # Archive mapping
        archive_res = self.client.post(f"/api/evidence-mappings/{mapping_id}/archive/", {
            "reason": "Superseded by updated annual submission."
        }, format='json')
        self.assertEqual(archive_res.status_code, status.HTTP_200_OK)

        # Verify excluded from active metric evidence list
        ev_list_res = self.client.get(f"/api/metrics/{self.metric_242.id}/evidence/")
        self.assertEqual(len(ev_list_res.data), 0)

        # Restore mapping
        restore_res = self.client.post(f"/api/evidence-mappings/{mapping_id}/restore/")
        self.assertEqual(restore_res.status_code, status.HTTP_200_OK)

        # Verify back in active metric evidence list
        ev_list_after = self.client.get(f"/api/metrics/{self.metric_242.id}/evidence/")
        self.assertEqual(len(ev_list_after.data), 1)

    def test_criteria_dashboard_progress_aggregation(self):
        """Criteria dashboard calculates real-time progress percentages and availability badges."""
        self.client.force_authenticate(user=self.iqac_user)
        # Initially no mappings exist
        res1 = self.client.get("/api/criteria/dashboard/")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        data1 = res1.data
        self.assertEqual(data1['total_criteria'], 2)
        self.assertEqual(data1['total_metrics'], 2)
        self.assertEqual(data1['metrics_with_evidence'], 0)
        self.assertEqual(data1['overall_availability_percentage'], 0.0)

        # Add mapping to Metric 2.4.2
        EvidenceMapping.objects.create(
            college=self.college_a,
            criterion=self.crit_2,
            metric=self.metric_242,
            evidence=self.evidence_verified,
            academic_year=self.ay,
            mapped_by=self.iqac_user,
            status='ACTIVE'
        )

        res2 = self.client.get("/api/criteria/dashboard/")
        data2 = res2.data
        self.assertEqual(data2['metrics_with_evidence'], 1)
        self.assertEqual(data2['metrics_without_evidence'], 1)
        self.assertEqual(data2['overall_availability_percentage'], 50.0)

        # Check Criterion 2 breakdown
        crit2_data = [c for c in data2['criteria'] if c['number'] == '2'][0]
        self.assertEqual(crit2_data['metrics_with_evidence_count'], 1)
        self.assertEqual(crit2_data['completion_percentage'], 50.0)
        self.assertEqual(crit2_data['availability_status'], 'PARTIAL')

    def test_criterion_detail_progress(self):
        """Criterion detail view returns individual metric benchmarks and progress."""
        self.client.force_authenticate(user=self.iqac_user)
        res = self.client.get(f"/api/criteria/{self.crit_2.id}/progress/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data
        self.assertEqual(data['criterion_number'], "2")
        self.assertEqual(data['total_metrics'], 2)
        metrics_list = data['metrics']
        self.assertEqual(len(metrics_list), 2)
        m242 = [m for m in metrics_list if m['number'] == '2.4.2'][0]
        self.assertEqual(m242['benchmark_count'], 5)

    def test_department_faculty_contributions(self):
        """Metric contributions endpoint aggregates department and faculty counts."""
        self.client.force_authenticate(user=self.iqac_user)
        EvidenceMapping.objects.create(
            college=self.college_a,
            criterion=self.crit_2,
            metric=self.metric_242,
            evidence=self.evidence_verified,
            academic_year=self.ay,
            mapped_by=self.iqac_user,
            status='ACTIVE'
        )
        res = self.client.get(f"/api/metrics/{self.metric_242.id}/contributions/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data
        self.assertEqual(data['total_evidence_count'], 1)
        self.assertEqual(data['department_contributions'][0]['code'], "CSE")
        self.assertEqual(data['department_contributions'][0]['count'], 1)
        self.assertEqual(data['faculty_contributions'][0]['employee_id'], "EMP-101")

    def test_bulk_mapping(self):
        """Safe bulk mapping endpoint maps multiple verified records atomically."""
        self.client.force_authenticate(user=self.iqac_user)
        # Create second verified evidence record
        act_2 = Activity.objects.create(
            college=self.college_a,
            department=self.dept_it,
            faculty=self.faculty_user,
            academic_year=self.ay,
            title="Advanced Cloud Architecture FDP",
            category=self.cat_fdp,
            status=ActivityStatus.VERIFIED_EVIDENCE
        )
        ev_2 = Evidence.objects.create(
            college=self.college_a,
            department=self.dept_it,
            faculty=self.faculty_user,
            activity=act_2,
            academic_year=self.ay,
            title=act_2.title,
            category="FDP",
            is_verified=True,
            status='ACTIVE'
        )

        payload = {
            "metric": str(self.metric_242.id),
            "evidence_ids": [str(self.evidence_verified.id), str(ev_2.id)],
            "notes": "Bulk mapping FDP cohort"
        }
        res = self.client.post("/api/evidence-mappings/bulk/", payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['mapped_count'], 2)
        self.assertEqual(res.data['skipped_duplicates'], 0)
        self.assertEqual(EvidenceMapping.objects.filter(metric=self.metric_242, status='ACTIVE').count(), 2)

    def test_evidence_suggestions(self):
        """Suggestions endpoint discovers matching unmapped verified candidates."""
        self.client.force_authenticate(user=self.iqac_user)
        # Metric 2.4.2 title has 'Faculty Development Program' and 'FDP'
        res = self.client.get(f"/api/metrics/{self.metric_242.id}/suggestions/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        suggestions = res.data
        self.assertTrue(len(suggestions) >= 1)
        self.assertEqual(suggestions[0]['id'], str(self.evidence_verified.id))
        self.assertIn("Title / Category Keyword Match", suggestions[0]['match_reasons'])
