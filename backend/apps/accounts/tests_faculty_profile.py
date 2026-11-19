from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.colleges.models import College
from apps.departments.models import Department
from apps.accounts.models import FacultyProfile
from apps.activities.models import Activity, ActivityType, ActivityStatus

User = get_user_model()


class FacultyProfileAndStatsTestCase(TestCase):
    def setUp(self):
        # College & Department
        self.college = College.objects.create(name="Demo Engineering College", code="DEMO-ENG", is_active=True)
        self.dept = Department.objects.create(college=self.college, name="Computer Science and Engineering", code="CSE")

        # Faculty User 1
        self.faculty1 = User.objects.create_user(
            email="faculty1@demo.edu", password="password123",
            role="FACULTY", college=self.college, department=self.dept,
            first_name="Rahul", last_name="Kulkarni", employee_id="CSE-001",
            designation="Assistant Professor"
        )
        self.profile1, _ = FacultyProfile.objects.get_or_create(
            user=self.faculty1,
            defaults={
                "college": self.college,
                "department": self.dept,
                "employee_id": "CSE-001",
                "designation": "Assistant Professor",
                "qualification": "Ph.D. in Computer Science",
                "phone": "9876543210",
                "bio": "Specialized in AI and Cloud Computing",
            }
        )

        # Faculty User 2
        self.faculty2 = User.objects.create_user(
            email="faculty2@demo.edu", password="password123",
            role="FACULTY", college=self.college, department=self.dept,
            first_name="Sneha", last_name="Iyer", employee_id="CSE-002",
            designation="Associate Professor"
        )
        self.profile2, _ = FacultyProfile.objects.get_or_create(
            user=self.faculty2,
            defaults={
                "college": self.college,
                "department": self.dept,
                "employee_id": "CSE-002",
                "designation": "Associate Professor",
                "qualification": "M.Tech in CSE",
            }
        )

        # Activities for Faculty 1: 3 FDPs, 2 Certifications, 4 Publications
        for i in range(3):
            Activity.objects.create(
                college=self.college, department=self.dept, faculty=self.faculty1,
                title=f"FDP Program {i+1}", activity_type=ActivityType.FDP,
                status=ActivityStatus.INCHARGE_VERIFIED
            )
        for i in range(2):
            Activity.objects.create(
                college=self.college, department=self.dept, faculty=self.faculty1,
                title=f"Cloud Certification {i+1}", activity_type=ActivityType.CERTIFICATION,
                status=ActivityStatus.VERIFIED_EVIDENCE
            )
        for i in range(4):
            Activity.objects.create(
                college=self.college, department=self.dept, faculty=self.faculty1,
                title=f"Research Paper {i+1}", activity_type=ActivityType.PUBLICATION,
                status=ActivityStatus.VERIFIED_EVIDENCE
            )

        # Activities for Faculty 2: 1 FDP
        Activity.objects.create(
            college=self.college, department=self.dept, faculty=self.faculty2,
            title="Faculty 2 FDP", activity_type=ActivityType.FDP,
            status=ActivityStatus.DRAFT
        )

        self.client1 = APIClient()
        self.client1.force_authenticate(user=self.faculty1)

        self.client2 = APIClient()
        self.client2.force_authenticate(user=self.faculty2)

    def test_get_own_faculty_profile(self):
        """Faculty retrieves own profile data accurately."""
        res = self.client1.get("/api/v1/auth/faculty/profile/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["user_email"], "faculty1@demo.edu")
        self.assertEqual(res.data["qualification"], "Ph.D. in Computer Science")
        self.assertEqual(res.data["designation"], "Assistant Professor")
        self.assertEqual(res.data["department_name"], "Computer Science and Engineering")

    def test_update_profile_and_upload_resume(self):
        """Faculty updates qualification, experience, and uploads resume document."""
        dummy_resume = SimpleUploadedFile(
            "rahul_resume.pdf",
            b"%PDF-1.4 dummy resume content",
            content_type="application/pdf"
        )
        res = self.client1.patch(
            "/api/v1/auth/faculty/profile/",
            {
                "qualification": "Ph.D., PostDoc (Stanford)",
                "experience_years": 8,
                "resume": dummy_resume,
            },
            format="multipart"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.profile1.refresh_from_db()
        self.assertEqual(self.profile1.qualification, "Ph.D., PostDoc (Stanford)")
        self.assertEqual(self.profile1.experience_years, 8)
        self.assertTrue(bool(self.profile1.resume))
        self.assertIn("rahul_resume", self.profile1.resume.name)

    def test_faculty_activities_isolation(self):
        """Faculty 1 only sees their own activities, not Faculty 2's."""
        res1 = self.client1.get("/api/v1/activities/")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        # Faculty 1 has 3 FDPs + 2 Certs + 4 Pubs = 9 activities
        self.assertEqual(len(res1.data["results"]), 9)
        for act in res1.data["results"]:
            self.assertEqual(str(act["faculty"]), str(self.faculty1.id))

        res2 = self.client2.get("/api/v1/activities/")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res2.data["results"]), 1)

    def test_upload_certification_with_document_and_isolation(self):
        """Faculty uploads certification activity with document and verifies data isolation."""
        # 1. Create certification activity
        act_res = self.client1.post(
            "/api/v1/activities/",
            {
                "title": "AWS Solutions Architect",
                "activity_type": "CERTIFICATION",
                "organizer": "Amazon Web Services",
                "certificate_number": "AWS-2026-99",
                "start_date": "2026-08-10",
                "description": "Cloud Architecture Certification",
            }
        )
        self.assertEqual(act_res.status_code, status.HTTP_201_CREATED)
        activity_id = act_res.data["id"]

        # 2. Upload document file
        cert_file = SimpleUploadedFile(
            "aws_cert.pdf",
            b"%PDF-1.4 dummy aws cert content",
            content_type="application/pdf"
        )
        doc_res = self.client1.post(
            "/api/v1/documents/",
            {
                "activity": activity_id,
                "file": cert_file,
                "file_name": "aws_cert.pdf",
                "file_size": "25000",
                "mime_type": "application/pdf",
                "document_type": "CERTIFICATE",
                "is_primary": "true",
            },
            format="multipart"
        )
        self.assertEqual(doc_res.status_code, status.HTTP_201_CREATED)
        doc_id = doc_res.data["id"]

        # 3. Verify Faculty 1 has now 3 certifications
        certs_f1 = [a for a in self.client1.get("/api/v1/activities/").data["results"] if a["activity_type"] == "CERTIFICATION"]
        self.assertEqual(len(certs_f1), 3)

        # 4. Verify Faculty 2 cannot see or access Faculty 1's document
        doc_f2 = self.client2.get(f"/api/v1/documents/{doc_id}/")
        self.assertEqual(doc_f2.status_code, status.HTTP_404_NOT_FOUND)

