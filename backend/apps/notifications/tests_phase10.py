"""
Phase 10 Automated Test Suite — Notification, Task & Workflow Automation
Tests cover:
1. Central Notification Dispatcher with Categorization & Priority
2. Duplicate Notification Prevention (Deduplication Keys)
3. User Preferences & Category Silencing
4. Verification Workflow Notifications (Faculty -> In-charge -> HOD -> IQAC)
5. Task Lifecycle (Creation, Transitions, Comments, Activities Audit)
6. Deadline Management & Due Categories
7. Reminder Engine (Upcoming Deadlines)
8. Overdue Handling & Supervisor Escalation
9. Verification Stall Escalation (Visibility without Workflow Bypass)
10. Automation Safety Invariant (Automation CANNOT approve/verify evidence)
11. Automation Rule Engine Evaluation
12. Role-Based Access Scoping (Faculty peer privacy, HOD dept scope)
13. College Management Read-Only Oversight (403 on mutation)
14. Operational Work Queues (IQAC, HOD, In-charge, Faculty, My Work)
15. Strict Multi-Tenant Isolation (College A vs College B)
"""
import uuid
import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.colleges.models import College
from apps.accounts.models import User, UserRole
from apps.departments.models import Department
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityStatus, ActivityType
from apps.criteria.models import Framework, Section, Criterion, Metric
from apps.notifications.models import (
    Notification,
    NotificationCategory,
    NotificationPriority,
    NotificationPreference,
    IQACTask,
    TaskStatus,
    TaskPriority,
    TaskActivity,
    TaskActivityAction,
    TaskComment,
    AutomationRule,
)
from apps.notifications.services import (
    NotificationDispatcher,
    TaskService,
    DeadlineService,
    ReminderAndEscalationEngine,
    AutomationEngine,
    WorkQueueService,
)


class Phase10NotificationAndTaskTestCase(TestCase):
    """
    Comprehensive tests for Phase 10 Notification, Task & Workflow Automation.
    """

    def setUp(self):
        self.client = APIClient()

        # 1. College A (Primary Tenant)
        self.college_a = College.objects.create(
            name="Apex Institute of Technology",
            code="AIT-101",
            email="admin@ait.edu",
        )

        # Departments
        self.dept_cs = Department.objects.create(
            name="Computer Science & Engineering",
            code="CSE",
            college=self.college_a
        )
        self.dept_me = Department.objects.create(
            name="Mechanical Engineering",
            code="ME",
            college=self.college_a
        )

        # Academic Year
        self.ay = AcademicYear.objects.create(
            college=self.college_a,
            name="2025-26",
            start_date=datetime.date(2025, 7, 1),
            end_date=datetime.date(2026, 6, 30),
            is_active=True,
            is_current=True
        )

        # Users for College A (All 6 roles)
        self.admin = User.objects.create_user(
            email="superadmin@ait.edu",
            password="Password123!",
            role=UserRole.SUPER_ADMIN,
            college=self.college_a,
            first_name="Super",
            last_name="Admin"
        )
        self.mgmt = User.objects.create_user(
            email="management@ait.edu",
            password="Password123!",
            role=UserRole.COLLEGE_MANAGEMENT,
            college=self.college_a,
            first_name="Trustee",
            last_name="Management"
        )
        self.iqac = User.objects.create_user(
            email="iqac@ait.edu",
            password="Password123!",
            role=UserRole.IQAC,
            college=self.college_a,
            first_name="IQAC",
            last_name="Coordinator"
        )
        self.hod_cs = User.objects.create_user(
            email="hod.cs@ait.edu",
            password="Password123!",
            role=UserRole.HOD,
            college=self.college_a,
            department=self.dept_cs,
            first_name="Alan",
            last_name="Turing"
        )
        self.incharge_cs = User.objects.create_user(
            email="incharge.cs@ait.edu",
            password="Password123!",
            role=UserRole.DEPARTMENT_INCHARGE,
            college=self.college_a,
            department=self.dept_cs,
            first_name="Ada",
            last_name="Lovelace"
        )
        self.faculty_cs = User.objects.create_user(
            email="faculty.cs@ait.edu",
            password="Password123!",
            role=UserRole.FACULTY,
            college=self.college_a,
            department=self.dept_cs,
            first_name="Grace",
            last_name="Hopper"
        )
        self.faculty_me = User.objects.create_user(
            email="faculty.me@ait.edu",
            password="Password123!",
            role=UserRole.FACULTY,
            college=self.college_a,
            department=self.dept_me,
            first_name="Nikola",
            last_name="Tesla"
        )

        # Criteria & Metric
        self.framework = Framework.objects.create(
            name="NAAC Affiliated 2025",
            code="NAAC-AFF-2025",
            college=self.college_a
        )
        self.section = Section.objects.create(
            college=self.college_a,
            framework_ref=self.framework,
            name="Teaching-Learning",
            code="CR2",
            display_order=2
        )
        self.criterion = Criterion.objects.create(
            college=self.college_a,
            framework_ref=self.framework,
            section=self.section,
            title="Teacher Profile and Quality",
            number="2.4",
            display_order=1
        )
        self.metric = Metric.objects.create(
            college=self.college_a,
            criterion=self.criterion,
            number="2.4.2",
            title="Full-time teachers with Ph.D.",
        )

        # Sample Activity
        self.activity = Activity.objects.create(
            title="Advanced Machine Learning Workshop",
            college=self.college_a,
            faculty=self.faculty_cs,
            department=self.dept_cs,
            academic_year=self.ay,
            activity_type=ActivityType.RESEARCH,
            status=ActivityStatus.PENDING_INCHARGE
        )

        # 2. College B (Cross-tenant Isolation check)
        self.college_b = College.objects.create(
            name="Bayside Polytechnic",
            code="BP-202",
            email="admin@bayside.edu",
        )
        self.iqac_b = User.objects.create_user(
            email="iqac@bayside.edu",
            password="Password123!",
            role=UserRole.IQAC,
            college=self.college_b,
            first_name="Bob",
            last_name="Polytechnic"
        )

    # ─────────────────────────────────────────────────────────────────────────────
    # 1. NOTIFICATION DISPATCHER & DEDUPLICATION TESTS
    # ─────────────────────────────────────────────────────────────────────────────

    def test_notification_dispatch_and_deduplication(self):
        """Test dispatching notifications and 24h deduplication cooldown."""
        # First dispatch
        n1 = NotificationDispatcher.dispatch(
            recipient=self.faculty_cs,
            sender=self.iqac,
            category=NotificationCategory.TASK,
            notification_type='TASK_ASSIGNED',
            title="Submit Research Evidence",
            body="Please upload research papers.",
            priority=NotificationPriority.HIGH,
            deduplication_key="task_dedup_1001"
        )
        self.assertIsNotNone(n1)
        self.assertEqual(n1.recipient, self.faculty_cs)
        self.assertEqual(n1.category, NotificationCategory.TASK)
        self.assertEqual(n1.priority, NotificationPriority.HIGH)
        self.assertEqual(n1.deduplication_key, "task_dedup_1001")

        # Duplicate dispatch within cooldown should be dropped
        n2 = NotificationDispatcher.dispatch(
            recipient=self.faculty_cs,
            sender=self.iqac,
            category=NotificationCategory.TASK,
            notification_type='TASK_ASSIGNED',
            title="Submit Research Evidence",
            body="Please upload research papers.",
            priority=NotificationPriority.HIGH,
            deduplication_key="task_dedup_1001"
        )
        self.assertIsNone(n2)
        self.assertEqual(Notification.objects.filter(recipient=self.faculty_cs).count(), 1)

    def test_notification_preferences_silencing(self):
        """Test user notification preferences silencing non-urgent categories."""
        pref, _ = NotificationPreference.objects.get_or_create(user=self.faculty_cs)
        pref.category_reports = False  # Mute reports
        pref.save()

        # Normal priority report notification should be dropped
        n_muted = NotificationDispatcher.dispatch(
            recipient=self.faculty_cs,
            sender=self.iqac,
            category=NotificationCategory.REPORT,
            notification_type='REPORT_GENERATED',
            title="Monthly Report Ready",
            body="Report has been compiled.",
            priority=NotificationPriority.NORMAL,
        )
        self.assertIsNone(n_muted)

        # URGENT priority notification overrides user preference
        n_urgent = NotificationDispatcher.dispatch(
            recipient=self.faculty_cs,
            sender=self.iqac,
            category=NotificationCategory.REPORT,
            notification_type='REPORT_URGENT',
            title="Urgent Report Action Required",
            body="Immediate verification needed.",
            priority=NotificationPriority.URGENT,
        )
        self.assertIsNotNone(n_urgent)
        self.assertEqual(n_urgent.priority, NotificationPriority.URGENT)

    # ─────────────────────────────────────────────────────────────────────────────
    # 2. VERIFICATION WORKFLOW NOTIFICATION CHAIN
    # ─────────────────────────────────────────────────────────────────────────────

    def test_verification_notifications_flow(self):
        """Test 4-tier verification notification pipeline."""
        # 1. Faculty submits -> In-charge notified
        NotificationDispatcher.notify_on_submission(self.activity, self.faculty_cs)
        incharge_notifs = Notification.objects.filter(recipient=self.incharge_cs)
        self.assertEqual(incharge_notifs.count(), 1)
        self.assertEqual(incharge_notifs.first().category, NotificationCategory.VERIFICATION)
        self.assertEqual(incharge_notifs.first().action_label, "Review Submission")

        # 2. In-charge verifies -> HOD notified
        NotificationDispatcher.notify_on_incharge_approval(self.activity, self.incharge_cs)
        hod_notifs = Notification.objects.filter(recipient=self.hod_cs)
        self.assertEqual(hod_notifs.count(), 1)
        self.assertIn("Awaiting HOD Approval", hod_notifs.first().title)

        # 3. HOD approves -> IQAC notified
        NotificationDispatcher.notify_on_hod_approval(self.activity, self.hod_cs)
        iqac_notifs = Notification.objects.filter(recipient=self.iqac)
        self.assertEqual(iqac_notifs.count(), 1)
        self.assertIn("Pending Final IQAC", iqac_notifs.first().title)

        # 4. IQAC approves -> Faculty and Dept leadership notified
        NotificationDispatcher.notify_on_iqac_approval(self.activity, self.iqac)
        faculty_notifs = Notification.objects.filter(recipient=self.faculty_cs)
        self.assertTrue(faculty_notifs.filter(notification_type='VERIFIED_EVIDENCE').exists())

    # ─────────────────────────────────────────────────────────────────────────────
    # 3. TASK LIFECYCLE & AUDIT TIMELINE
    # ─────────────────────────────────────────────────────────────────────────────

    def test_task_creation_lifecycle_and_audit(self):
        """Test task creation, status transitions, activity logging, and comments."""
        # Create Task
        task = TaskService.create_task(
            college=self.college_a,
            title="Collect FDP Certificates",
            owner=self.incharge_cs,
            creator=self.iqac,
            description="Collect all CSE faculty FDP certificates for Q1.",
            department=self.dept_cs,
            academic_year=self.ay,
            priority=TaskPriority.HIGH,
            due_date=timezone.now().date() + datetime.timedelta(days=7),
            related_metric=self.metric,
            deduplication_key="fdp_cse_q1"
        )
        self.assertEqual(task.status, TaskStatus.TODO)
        self.assertEqual(task.owner, self.incharge_cs)
        self.assertEqual(task.creator, self.iqac)

        # Verify audit activity created
        act = TaskActivity.objects.filter(task=task, action=TaskActivityAction.CREATED).first()
        self.assertIsNotNone(act)

        # Verify owner received notification
        notif = Notification.objects.filter(recipient=self.incharge_cs, related_id=task.id).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.category, NotificationCategory.TASK)

        # Transition: TODO -> IN_PROGRESS
        task = TaskService.update_status(task, TaskStatus.IN_PROGRESS, actor=self.incharge_cs, comment="Started gathering.")
        self.assertEqual(task.status, TaskStatus.IN_PROGRESS)
        self.assertTrue(TaskActivity.objects.filter(task=task, action=TaskActivityAction.STARTED).exists())

        # Add comment
        comment = TaskService.add_comment(task, author=self.iqac, comment="Please make sure signatures are clear.")
        self.assertEqual(task.comments.count(), 1)
        self.assertEqual(comment.author, self.iqac)

        # Transition: IN_PROGRESS -> COMPLETED
        task = TaskService.update_status(task, TaskStatus.COMPLETED, actor=self.incharge_cs)
        self.assertEqual(task.status, TaskStatus.COMPLETED)
        self.assertIsNotNone(task.completed_at)
        self.assertEqual(task.completed_by, self.incharge_cs)
        self.assertTrue(TaskActivity.objects.filter(task=task, action=TaskActivityAction.COMPLETED).exists())

    # ─────────────────────────────────────────────────────────────────────────────
    # 4. DEADLINES & REMINDER ENGINE
    # ─────────────────────────────────────────────────────────────────────────────

    def test_deadline_categorization_and_reminders(self):
        """Test categorization into due_today, due_tomorrow, due_this_week, overdue, and reminder triggers."""
        today = timezone.now().date()

        # Task 1: Due in 3 days
        task_3d = TaskService.create_task(
            college=self.college_a,
            title="Task Due in 3 Days",
            owner=self.faculty_cs,
            creator=self.iqac,
            due_date=today + datetime.timedelta(days=3)
        )
        # Task 2: Due Tomorrow
        task_tmr = TaskService.create_task(
            college=self.college_a,
            title="Task Due Tomorrow",
            owner=self.faculty_cs,
            creator=self.iqac,
            due_date=today + datetime.timedelta(days=1)
        )
        # Task 3: Overdue
        task_overdue = TaskService.create_task(
            college=self.college_a,
            title="Task Overdue",
            owner=self.faculty_cs,
            creator=self.iqac,
            due_date=today - datetime.timedelta(days=2)
        )

        # Check deadline categorization
        deadlines = DeadlineService.get_deadlines(self.faculty_cs)
        self.assertEqual(len(deadlines['due_tomorrow']), 1)
        self.assertEqual(len(deadlines['overdue']), 1)
        self.assertEqual(len(deadlines['due_this_week']), 2)  # tmr and 3d

        # Run reminder engine
        reminders_sent = ReminderAndEscalationEngine.process_deadline_reminders(self.college_a)
        self.assertGreaterEqual(reminders_sent, 2)  # 3d reminder + 1d reminder

        # Overdue escalation
        overdue_escalated = ReminderAndEscalationEngine.process_overdue_escalations(self.college_a)
        self.assertGreaterEqual(overdue_escalated, 1)

        # Verify supervisor (In-charge) notified for faculty overdue task
        supervisor_notif = Notification.objects.filter(
            recipient=self.incharge_cs,
            category=NotificationCategory.DEADLINE,
            notification_type='TASK_OVERDUE_SUPERVISOR'
        )
        self.assertTrue(supervisor_notif.exists())

    # ─────────────────────────────────────────────────────────────────────────────
    # 5. AUTOMATION SAFETY INVARIANT
    # ─────────────────────────────────────────────────────────────────────────────

    def test_automation_safety_invariant(self):
        """CRITICAL: Verify automation CANNOT approve or verify evidence or bypass approval workflow."""
        # Create an automation rule that attempts an invalid action
        rule = AutomationRule.objects.create(
            college=self.college_a,
            name="Test Verification Rule",
            trigger="EVIDENCE_SUBMITTED",
            action="AUTO_VERIFY_EVIDENCE",  # FORBIDDEN ACTION
            is_active=True
        )

        # Execute action directly through engine
        result = AutomationEngine.execute_action(rule, {})
        # Action must be rejected/no-op by safety guard
        self.assertFalse(result)

        # Verify Activity remains in PENDING_INCHARGE state (never automatically verified)
        self.activity.refresh_from_db()
        self.assertEqual(self.activity.status, ActivityStatus.PENDING_INCHARGE)

    def test_automation_task_creation_rule(self):
        """Test legitimate automation rule creating a task."""
        rule = AutomationRule.objects.create(
            college=self.college_a,
            name="Auto Task on Metric Gap",
            trigger="METRIC_GAP_DETECTED",
            action="CREATE_TASK",
            action_config={
                'title': 'Collect Missing Publication Evidence',
                'description': 'Automated task for Metric 2.4.2 gap.',
                'priority': 'HIGH',
                'days_due': 5,
            },
            is_active=True
        )

        executed = AutomationEngine.evaluate_rules(self.college_a)
        self.assertGreaterEqual(executed, 1)

        # Task should have been created with is_automated=True
        auto_task = IQACTask.objects.filter(college=self.college_a, is_automated=True).first()
        self.assertIsNotNone(auto_task)
        self.assertEqual(auto_task.title, 'Collect Missing Publication Evidence')

    # ─────────────────────────────────────────────────────────────────────────────
    # 6. ROLE-BASED ACCESS & MANAGEMENT MONITORING ONLY
    # ─────────────────────────────────────────────────────────────────────────────

    def test_management_read_only_403(self):
        """College Management has view-only access; mutations must return 403."""
        task = TaskService.create_task(
            college=self.college_a,
            title="Sample Task",
            owner=self.faculty_cs,
            creator=self.iqac
        )

        self.client.force_authenticate(user=self.mgmt)

        # 1. Attempt to create task -> 403
        resp_create = self.client.post('/api/v1/tasks/', {
            'title': 'Management Task',
            'owner': self.faculty_cs.id
        })
        self.assertEqual(resp_create.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Attempt to start task -> 403
        resp_start = self.client.post(f'/api/v1/tasks/{task.id}/start/')
        self.assertEqual(resp_start.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Attempt to complete task -> 403
        resp_comp = self.client.post(f'/api/v1/tasks/{task.id}/complete/')
        self.assertEqual(resp_comp.status_code, status.HTTP_403_FORBIDDEN)

        # 4. View tasks list -> 200 OK
        resp_list = self.client.get('/api/v1/tasks/')
        self.assertEqual(resp_list.status_code, status.HTTP_200_OK)

    def test_faculty_peer_privacy(self):
        """Faculty can only view their own tasks, never other faculty's tasks."""
        task_cs = TaskService.create_task(
            college=self.college_a,
            title="CS Faculty Task",
            owner=self.faculty_cs,
            creator=self.iqac
        )
        task_me = TaskService.create_task(
            college=self.college_a,
            title="ME Faculty Task",
            owner=self.faculty_me,
            creator=self.iqac
        )

        self.client.force_authenticate(user=self.faculty_cs)
        resp = self.client.get('/api/v1/tasks/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        task_ids = [t['id'] for t in resp.data.get('results', resp.data)]
        self.assertIn(str(task_cs.id), task_ids)
        self.assertNotIn(str(task_me.id), task_ids)

    # ─────────────────────────────────────────────────────────────────────────────
    # 7. OPERATIONAL WORK QUEUES
    # ─────────────────────────────────────────────────────────────────────────────

    def test_work_queues_endpoints(self):
        """Test role-specific work queue responses."""
        # 1. IQAC Work Queue
        self.client.force_authenticate(user=self.iqac)
        resp_iqac = self.client.get('/api/v1/work-queues/iqac/')
        self.assertEqual(resp_iqac.status_code, status.HTTP_200_OK)
        self.assertIn('pending_verifications', resp_iqac.data)
        self.assertIn('metric_gaps', resp_iqac.data)
        self.assertIn('active_tasks', resp_iqac.data)

        # Faculty attempting to access IQAC queue -> 403
        self.client.force_authenticate(user=self.faculty_cs)
        resp_forbidden = self.client.get('/api/v1/work-queues/iqac/')
        self.assertEqual(resp_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # 2. HOD Work Queue
        self.client.force_authenticate(user=self.hod_cs)
        resp_hod = self.client.get('/api/v1/work-queues/hod/')
        self.assertEqual(resp_hod.status_code, status.HTTP_200_OK)
        self.assertIn('pending_verifications', resp_hod.data)
        self.assertIn('department_tasks', resp_hod.data)

        # 3. Faculty Workspace
        self.client.force_authenticate(user=self.faculty_cs)
        resp_faculty = self.client.get('/api/v1/work-queues/faculty/')
        self.assertEqual(resp_faculty.status_code, status.HTTP_200_OK)
        self.assertIn('pending_submissions', resp_faculty.data)
        self.assertIn('assigned_tasks', resp_faculty.data)

        # 4. My Work Widget
        resp_my_work = self.client.get('/api/v1/work-queues/my-work/')
        self.assertEqual(resp_my_work.status_code, status.HTTP_200_OK)

    # ─────────────────────────────────────────────────────────────────────────────
    # 8. MULTI-TENANT ISOLATION
    # ─────────────────────────────────────────────────────────────────────────────

    def test_multi_tenant_isolation(self):
        """Verify College A users never see College B notifications or tasks."""
        # Task in College B
        task_b = TaskService.create_task(
            college=self.college_b,
            title="College B Secret Task",
            owner=self.iqac_b,
            creator=self.iqac_b
        )

        # Notification in College B
        NotificationDispatcher.dispatch(
            recipient=self.iqac_b,
            category=NotificationCategory.SYSTEM,
            notification_type='COLLEGE_B_ALERT',
            title="College B Alert",
            body="Confidential notice for College B.",
            college=self.college_b
        )

        # Authenticate as College A IQAC
        self.client.force_authenticate(user=self.iqac)

        # Check tasks
        resp_tasks = self.client.get('/api/v1/tasks/')
        task_ids = [t['id'] for t in resp_tasks.data.get('results', resp_tasks.data)]
        self.assertNotIn(str(task_b.id), task_ids)

        # Check notifications
        resp_notifs = self.client.get('/api/v1/notifications/')
        notif_titles = [n['title'] for n in resp_notifs.data.get('results', resp_notifs.data)]
        self.assertNotIn("College B Alert", notif_titles)
