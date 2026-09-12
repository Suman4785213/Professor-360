"""
Phase 9 Automated Test Suite — Advanced Analytics & Executive Intelligence
Tests cover:
1. Executive Management Dashboard KPIs & Trends
2. IQAC Intelligence Operations & Workload
3. Academic Year Comparison & Growth Metrics
4. Department Benchmarking Matrix
5. Role-Scoped Faculty Output Analytics (Faculty, HOD, Management)
6. Evidence Health & Repository Integrity
7. Verification Pipeline Latency & Bottlenecks
8. Evidence Gap Cross-Tabulation Matrix
9. Data Quality Hygiene Scanner & Severity Rating
10. Grounded AI Insights (Numerical Accuracy & Advisory Rules)
11. Forecasting Velocity & Insufficient Data Fallback
12. Management Monitoring-Only Rule (403 on mutate)
13. Strict Multi-Tenant Isolation
"""
import uuid
import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.colleges.models import College
from apps.accounts.models import User, UserRole, FacultyProfile
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityStatus, ActivityCategory, Document
from apps.evidence.models import Evidence
from apps.criteria.models import Framework, Section, Criterion, Metric, EvidenceMapping
from apps.analytics.models import AIExecutiveInsight, ExecutiveSnapshot, InsightCategory, InsightSeverity
from apps.analytics.services import (
    AnalyticsService,
    EvidenceAnalyticsService,
    FacultyAnalyticsService,
    DepartmentAnalyticsService,
    VerificationPipelineAnalyticsService,
    AcademicYearComparisonService,
    EvidenceGapMatrixService,
    DataQualityService,
    PreparationRiskService,
    ForecastingService,
    AIInsightEngine,
)


class Phase9AnalyticsTestCase(TestCase):
    """
    Comprehensive test cases for Phase 9 Analytics & Executive Intelligence.
    """

    def setUp(self):
        self.client = APIClient()

        # 1. College A (Primary Tenant)
        self.college_a = College.objects.create(
            name="Apex Engineering College",
            code="APEX-ENG",
            email="admin@apex.edu",
            is_active=True
        )

        # 2. College B (Secondary Tenant for Isolation Tests)
        self.college_b = College.objects.create(
            name="Beacon Institute of Technology",
            code="BEACON-TECH",
            email="admin@beacon.edu",
            is_active=True
        )

        # 3. Academic Years
        self.ay_2023 = AcademicYear.objects.create(
            college=self.college_a,
            name="2023-24",
            start_date=datetime.date(2023, 7, 1),
            end_date=datetime.date(2024, 6, 30),
            is_active=True,
            is_current=False
        )
        self.ay_2024 = AcademicYear.objects.create(
            college=self.college_a,
            name="2024-25",
            start_date=datetime.date(2024, 7, 1),
            end_date=datetime.date(2025, 6, 30),
            is_active=True,
            is_current=True
        )

        # 4. Departments
        self.dept_cse = Department.objects.create(
            college=self.college_a,
            name="Computer Science & Engineering",
            code="CSE",
            is_active=True
        )
        self.dept_it = Department.objects.create(
            college=self.college_a,
            name="Information Technology",
            code="IT",
            is_active=True
        )

        # 5. User Roles (College A)
        self.super_admin = User.objects.create_user(
            email="admin@test.com", password="password123", role=UserRole.SUPER_ADMIN
        )
        self.management = User.objects.create_user(
            email="mgmt@apex.edu", password="password123", role=UserRole.COLLEGE_MANAGEMENT, college=self.college_a
        )
        self.iqac = User.objects.create_user(
            email="iqac@apex.edu", password="password123", role=UserRole.IQAC, college=self.college_a
        )
        self.hod_cse = User.objects.create_user(
            email="hod.cse@apex.edu", password="password123", role=UserRole.HOD,
            college=self.college_a, department=self.dept_cse
        )
        self.faculty_cse = User.objects.create_user(
            email="faculty.cse@apex.edu", password="password123", role=UserRole.FACULTY,
            college=self.college_a, department=self.dept_cse
        )
        FacultyProfile.objects.create(
            user=self.faculty_cse,
            college=self.college_a,
            department=self.dept_cse,
            employee_id="EMP-CSE-01",
            designation="Assistant Professor"
        )

        self.faculty_it = User.objects.create_user(
            email="faculty.it@apex.edu", password="password123", role=UserRole.FACULTY,
            college=self.college_a, department=self.dept_it
        )
        FacultyProfile.objects.create(
            user=self.faculty_it,
            college=self.college_a,
            department=self.dept_it,
            employee_id="EMP-IT-01",
            designation="Associate Professor"
        )

        # College B Department & Faculty
        self.dept_b = Department.objects.create(
            college=self.college_b, name="Electronics Engineering", code="ECE", is_active=True
        )
        self.faculty_b = User.objects.create_user(
            email="faculty@beacon.edu", password="password123", role=UserRole.FACULTY,
            college=self.college_b, department=self.dept_b
        )

        # 6. Categories
        self.cat_fdp = ActivityCategory.objects.create(
            college=self.college_a, name="Faculty Development Programme", code="FDP", is_active=True
        )
        self.cat_pub = ActivityCategory.objects.create(
            college=self.college_a, name="Research Publication", code="PUB", is_active=True
        )

        # 7. Framework, Section, Criterion, Metric
        self.framework = Framework.objects.create(
            college=self.college_a, name="NAAC 2026", code="NAAC_2026", version="2026.1", is_active=True
        )
        self.section = Section.objects.create(
            college=self.college_a, framework_ref=self.framework, name="Part B: Criteria", code="PART_B"
        )
        self.criterion = Criterion.objects.create(
            college=self.college_a, framework_ref=self.framework, section=self.section,
            number="1", title="Curricular Aspects", weightage=100.0, is_active=True
        )
        self.metric = Metric.objects.create(
            college=self.college_a, criterion=self.criterion,
            number="1.1.1", title="Curricula developed and implemented", is_active=True
        )

        # 8. Seed Verified Activities & Evidence in College A
        self.act_cse_1 = Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_cse,
            academic_year=self.ay_2024, category=self.cat_fdp, title="AI/ML FDP Attendance",
            description="5-day National Level Workshop",
            status=ActivityStatus.VERIFIED_EVIDENCE
        )
        self.doc_cse_1 = Document.objects.create(
            activity=self.act_cse_1,
            college=self.college_a,
            department=self.dept_cse,
            uploaded_by=self.faculty_cse,
            file_name="fdp_certificate.pdf",
            file_size=1024,
            mime_type="application/pdf",
            file_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            status='VERIFIED'
        )
        self.evidence_cse_1 = Evidence.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_cse,
            activity=self.act_cse_1, academic_year=self.ay_2024, title="Verified FDP Certificate",
            document=self.doc_cse_1, is_verified=True, status='ACTIVE'
        )
        self.mapping_1 = EvidenceMapping.objects.create(
            college=self.college_a, criterion=self.criterion, metric=self.metric,
            evidence=self.evidence_cse_1, academic_year=self.ay_2024, mapped_by=self.iqac, status='ACTIVE'
        )

        # Pending Activity in IT department
        self.act_it_pending = Activity.objects.create(
            college=self.college_a, department=self.dept_it, faculty=self.faculty_it,
            academic_year=self.ay_2024, category=self.cat_pub, title="IEEE Research Paper Submission",
            description="Cloud Computing Paper",
            status=ActivityStatus.PENDING_IQAC
        )

    def test_executive_analytics_summary(self):
        """Test Executive Management KPIs, forecast, and risk summary calculations."""
        self.client.force_authenticate(user=self.management)
        response = self.client.get('/api/analytics/executive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        kpis = response.data['kpis']
        self.assertEqual(kpis['total_faculty'], 2)
        self.assertEqual(kpis['total_departments'], 2)
        self.assertEqual(kpis['verified_evidence'], 1)
        self.assertEqual(kpis['pending_evidence'], 1)
        self.assertIn('data_quality_score', kpis)
        self.assertIn('preparation_risk_level', kpis)

    def test_iqac_intelligence_workload_and_pipeline(self):
        """Test IQAC intelligence command center with pipeline stages and bottlenecks."""
        self.client.force_authenticate(user=self.iqac)
        response = self.client.get('/api/analytics/iqac-intelligence/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        pipeline = response.data['verification_pipeline']
        self.assertEqual(pipeline['total_pending'], 1)  # 1 pending IQAC
        stages = pipeline['pipeline_stages']
        self.assertTrue(len(stages) >= 4)
        iqac_stage = next(s for s in stages if s['id'] == 'iqac_stage')
        self.assertEqual(iqac_stage['count'], 1)

    def test_academic_year_comparison(self):
        """Test multi-year trend calculation and growth rate."""
        # Add 1 verified activity in 2023-24
        act_prev = Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_cse,
            academic_year=self.ay_2023, category=self.cat_fdp, title="Past FDP",
            status=ActivityStatus.VERIFIED_EVIDENCE
        )
        Evidence.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_cse,
            activity=act_prev, academic_year=self.ay_2023, title="Past Evidence", is_verified=True
        )

        self.client.force_authenticate(user=self.iqac)
        response = self.client.get('/api/analytics/academic-year-comparison/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # 2023-24 and 2024-25
        self.assertEqual(response.data[0]['year_name'], '2023-24')
        self.assertEqual(response.data[1]['year_name'], '2024-25')

    def test_department_benchmarking(self):
        """Test department comparison returns accurate faculty, activities, and evidence."""
        self.client.force_authenticate(user=self.iqac)
        response = self.client.get('/api/analytics/department-comparison/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        depts = response.data
        cse = next(d for d in depts if d['code'] == 'CSE')
        it = next(d for d in depts if d['code'] == 'IT')

        self.assertEqual(cse['faculty_count'], 1)
        self.assertEqual(cse['verified_evidence'], 1)
        self.assertEqual(it['pending_submissions'], 1)

    def test_faculty_participation_role_scoping(self):
        """Test strict role-based scoping: Faculty sees only own output, Management sees all."""
        # 1. Faculty CSE requesting: should only see CSE faculty's activity
        self.client.force_authenticate(user=self.faculty_cse)
        response = self.client.get('/api/analytics/faculty-participation/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_activities'], 1)
        self.assertEqual(response.data['verified_activities'], 1)

        # 2. Faculty IT requesting: should only see IT faculty's activity (1 pending, 0 verified)
        self.client.force_authenticate(user=self.faculty_it)
        response_it = self.client.get('/api/analytics/faculty-participation/')
        self.assertEqual(response_it.status_code, status.HTTP_200_OK)
        self.assertEqual(response_it.data['verified_activities'], 0)

        # 3. College Management requesting: sees total across both departments
        self.client.force_authenticate(user=self.management)
        response_mgmt = self.client.get('/api/analytics/faculty-participation/')
        self.assertEqual(response_mgmt.status_code, status.HTTP_200_OK)
        self.assertEqual(response_mgmt.data['total_activities'], 2)

    def test_evidence_health_analytics(self):
        """Test evidence health indicators and duplicate candidate risks."""
        self.client.force_authenticate(user=self.iqac)
        response = self.client.get('/api/analytics/evidence-health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        health = response.data
        self.assertEqual(health['total_documents'], 1)
        self.assertEqual(health['verified_documents'], 1)
        self.assertEqual(health['unmapped_evidence_count'], 0)  # It is mapped to Metric 1.1.1
        self.assertEqual(health['health_indicators']['duplicate_risk'], 'LOW')

    def test_evidence_gap_matrix(self):
        """Test evidence gap matrix cross-tabulation (Metric x Department)."""
        self.client.force_authenticate(user=self.iqac)
        response = self.client.get('/api/analytics/gap-matrix/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertEqual(len(data['departments']), 2)
        matrix = data['matrix']
        self.assertTrue(len(matrix) >= 1)

        m111 = matrix[0]
        # CSE has 1 mapped evidence -> PARTIAL
        cse_cell = m111['departments'][str(self.dept_cse.id)]
        self.assertEqual(cse_cell['status'], 'PARTIAL')
        # IT has 0 mapped evidence -> MISSING
        it_cell = m111['departments'][str(self.dept_it.id)]
        self.assertEqual(it_cell['status'], 'MISSING')

    def test_data_quality_scanner(self):
        """Test data quality scanner detects incomplete records and computes score."""
        # Create an activity without description to trigger an anomaly
        Activity.objects.create(
            college=self.college_a, department=self.dept_cse, faculty=self.faculty_cse,
            academic_year=self.ay_2024, category=self.cat_fdp, title="Activity With No Description",
            description=""
        )

        self.client.force_authenticate(user=self.iqac)
        response = self.client.get('/api/analytics/data-quality/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        quality = response.data
        self.assertTrue(quality['quality_score'] < 100.0)
        issue_types = [i['issue_type'] for i in quality['issues']]
        self.assertIn('ACTIVITY_MISSING_DESCRIPTION', issue_types)

    def test_ai_executive_insights_grounded(self):
        """Test AI insights generation uses real data numbers and adheres to human advisory rule."""
        self.client.force_authenticate(user=self.iqac)
        response = self.client.post('/api/analytics/ai-insights/refresh/', {'academic_year': str(self.ay_2024.id)})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        insights = response.data
        self.assertTrue(len(insights) >= 1)
        growth_insight = next((i for i in insights if i['category'] == InsightCategory.GROWTH), None)
        self.assertIsNotNone(growth_insight)
        # Verify source_metrics dict is present and contains real verified numbers
        self.assertIn('verified_evidence', growth_insight['source_metrics'])
        self.assertEqual(growth_insight['source_metrics']['verified_evidence'], 1)

    def test_forecasting_insufficient_data_fallback(self):
        """Test that forecasting returns disclaimer when verified data < 5 records."""
        self.client.force_authenticate(user=self.iqac)
        response = self.client.get('/api/analytics/forecast/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Only 1 verified evidence exists in College A
        self.assertFalse(response.data['has_sufficient_data'])
        self.assertEqual(response.data['forecast_confidence'], 'INSUFFICIENT_DATA')
        self.assertIn('Not enough historical', response.data['disclaimer'])

    def test_management_monitoring_only_403_on_mutate(self):
        """Test College Management can view analytics but gets 403 Forbidden on write."""
        self.client.force_authenticate(user=self.management)

        # GET is permitted
        resp_get = self.client.get('/api/analytics/executive/')
        self.assertEqual(resp_get.status_code, status.HTTP_200_OK)

        # POST /ai-insights/refresh/ is blocked
        resp_post = self.client.post('/api/analytics/ai-insights/refresh/', {})
        self.assertEqual(resp_post.status_code, status.HTTP_403_FORBIDDEN)

    def test_strict_multi_tenant_isolation(self):
        """Test College A cannot see College B activities, evidence, or AI insights."""
        # Create College B data
        cat_b = ActivityCategory.objects.create(college=self.college_b, name="B FDP", code="BFDP")
        ay_b = AcademicYear.objects.create(
            college=self.college_b, name="2024-25",
            start_date=datetime.date(2024, 7, 1), end_date=datetime.date(2025, 6, 30)
        )
        act_b = Activity.objects.create(
            college=self.college_b, department=self.dept_b, faculty=self.faculty_b, academic_year=ay_b,
            category=cat_b, title="College B Secret Activity", status=ActivityStatus.VERIFIED_EVIDENCE
        )
        Evidence.objects.create(
            college=self.college_b, department=self.dept_b, faculty=self.faculty_b, activity=act_b,
            academic_year=ay_b, title="College B Secret Evidence", is_verified=True
        )

        # Login as College A Management
        self.client.force_authenticate(user=self.management)
        response = self.client.get('/api/analytics/executive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # College A's verified count should strictly remain 1, ignoring College B
        self.assertEqual(response.data['kpis']['verified_evidence'], 1)
