"""
Notifications & Workflow Automation Services — Phase 10
Event Dispatcher, Task Lifecycle, Reminder Engine, Escalation Engine,
Automation Rule Engine, and Unified Work Queues.
"""
import datetime
from django.utils import timezone
from django.db.models import Q, Count
from apps.notifications.models import (
    Notification, NotificationCategory, NotificationPriority,
    NotificationPreference, NotificationTemplate,
    IQACTask, TaskStatus, TaskPriority, TaskActivity, TaskActivityAction, TaskComment,
    AutomationRule
)
from apps.accounts.models import User, UserRole
from apps.activities.models import Activity, ActivityStatus
from apps.criteria.models import Metric, EvidenceMapping
from apps.evidence.models import Evidence


class NotificationDispatcher:
    """
    Central event-driven notification dispatcher with preference checking,
    template variable interpolation, and deduplication cooldowns.
    """

    @staticmethod
    def dispatch(
        recipient,
        notification_type,
        title,
        body,
        sender=None,
        category=NotificationCategory.SYSTEM,
        priority=NotificationPriority.NORMAL,
        action_url='',
        action_label='',
        related_model='',
        related_id=None,
        college=None,
        deduplication_key='',
        metadata=None,
    ):
        """
        Core notification creator.
        Checks user preferences and prevents duplicate spam.
        """
        if not recipient or not recipient.is_active:
            return None

        col = college or getattr(recipient, 'college', None)

        # 1. User Preference Check (if non-urgent, respect muted categories)
        if priority != NotificationPriority.URGENT:
            pref = NotificationPreference.objects.filter(user=recipient).first()
            if pref:
                if category == NotificationCategory.VERIFICATION and not pref.category_verification:
                    return None
                if category == NotificationCategory.TASK and not pref.category_tasks:
                    return None
                if category == NotificationCategory.DEADLINE and not pref.category_deadlines:
                    return None
                if category in (NotificationCategory.AQAR, NotificationCategory.SSR) and not pref.category_aqar_ssr:
                    return None
                if category == NotificationCategory.REPORT and not pref.category_reports:
                    return None
                if category == NotificationCategory.SYSTEM and not pref.category_system:
                    return None

        # 2. Duplicate Prevention via Deduplication Key
        if deduplication_key:
            # Check if identical notification was sent in last 24 hours
            recent_duplicate = Notification.objects.filter(
                recipient=recipient,
                deduplication_key=deduplication_key,
                created_at__gte=timezone.now() - datetime.timedelta(hours=24)
            ).exists()
            if recent_duplicate:
                return None

        # 3. Variable Interpolation if Template exists
        if col:
            tmpl = NotificationTemplate.objects.filter(college=col, code=notification_type, is_active=True).first()
            if not tmpl:
                tmpl = NotificationTemplate.objects.filter(college=None, code=notification_type, is_active=True).first()
            if tmpl and metadata:
                for k, v in metadata.items():
                    title = title.replace(f"{{{{{k}}}}}", str(v))
                    body = body.replace(f"{{{{{k}}}}}", str(v))
                if tmpl.action_label and not action_label:
                    action_label = tmpl.action_label
                if tmpl.action_url_template and not action_url:
                    action_url = tmpl.action_url_template
                    for k, v in metadata.items():
                        action_url = action_url.replace(f"{{{{{k}}}}}", str(v))

        notif = Notification.objects.create(
            college=col,
            recipient=recipient,
            sender=sender,
            category=category,
            notification_type=notification_type,
            title=title,
            body=body,
            priority=priority,
            action_url=action_url,
            action_label=action_label or 'View Details',
            related_model=related_model,
            related_id=related_id,
            deduplication_key=deduplication_key,
            metadata=metadata or {},
        )

        try:
            from apps.integrations.services import EmailService
            EmailService.send_templated_email(
                college=col,
                recipient=recipient.email,
                event=notification_type,
                context={
                    "faculty_name": recipient.get_full_name(),
                    "recipient_name": recipient.get_full_name(),
                    "title": title,
                    "body": body,
                    **(metadata or {})
                },
                deduplication_key=f"email_{deduplication_key}" if deduplication_key else "",
                is_security_critical=(priority == NotificationPriority.URGENT)
            )
        except Exception:
            pass

        return notif

    # ─── Verification Workflow Notification Triggers ────────────────────────────

    @staticmethod
    def notify_on_submission(activity, sender):
        """Faculty submits -> Notify Department In-charge."""
        incharges = User.objects.filter(
            college=activity.college,
            department=activity.department,
            role=UserRole.DEPARTMENT_INCHARGE,
            is_active=True
        )
        for inc in incharges:
            NotificationDispatcher.dispatch(
                recipient=inc,
                sender=sender,
                category=NotificationCategory.VERIFICATION,
                notification_type='SUBMISSION_NEW',
                title=f"New Submission: {activity.title}",
                body=f"{sender.get_full_name()} submitted an activity for Department In-charge verification.",
                priority=NotificationPriority.NORMAL,
                action_url=f"/incharge/verification/{activity.id}",
                action_label="Review Submission",
                related_model='Activity',
                related_id=activity.id,
                college=activity.college,
                deduplication_key=f"act_{activity.id}_submitted",
                metadata={'faculty_name': sender.get_full_name(), 'activity_title': activity.title}
            )

    @staticmethod
    def notify_on_incharge_approval(activity, sender):
        """In-charge verifies -> Notify HOD."""
        hods = User.objects.filter(
            college=activity.college,
            department=activity.department,
            role=UserRole.HOD,
            is_active=True
        )
        for hod in hods:
            NotificationDispatcher.dispatch(
                recipient=hod,
                sender=sender,
                category=NotificationCategory.VERIFICATION,
                notification_type='INCHARGE_VERIFIED',
                title=f"Awaiting HOD Approval: {activity.title}",
                body=f"Department In-charge verified '{activity.title}' by {activity.faculty.get_full_name()}. Ready for your review.",
                priority=NotificationPriority.NORMAL,
                action_url=f"/hod/verification/{activity.id}",
                action_label="Approve Record",
                related_model='Activity',
                related_id=activity.id,
                college=activity.college,
                deduplication_key=f"act_{activity.id}_incharge_approved",
                metadata={'incharge_name': sender.get_full_name(), 'activity_title': activity.title}
            )

    @staticmethod
    def notify_on_incharge_rejection(activity, sender, reason):
        """In-charge rejects -> Notify Faculty to correct."""
        NotificationDispatcher.dispatch(
            recipient=activity.faculty,
            sender=sender,
            category=NotificationCategory.VERIFICATION,
            notification_type='RETURNED_BY_INCHARGE',
            title=f"Correction Needed: {activity.title}",
            body=f"In-charge returned your submission with remark: \"{reason}\". Please update and resubmit.",
            priority=NotificationPriority.HIGH,
            action_url=f"/faculty/activities/{activity.id}/edit",
            action_label="Edit & Resubmit",
            related_model='Activity',
            related_id=activity.id,
            college=activity.college,
            deduplication_key=f"act_{activity.id}_incharge_rejected_{timezone.now().date()}",
            metadata={'reason': reason, 'activity_title': activity.title}
        )

    @staticmethod
    def notify_on_hod_approval(activity, sender):
        """HOD approves -> Notify IQAC Coordinators."""
        iqac_users = User.objects.filter(
            college=activity.college,
            role=UserRole.IQAC,
            is_active=True
        )
        for iqac in iqac_users:
            NotificationDispatcher.dispatch(
                recipient=iqac,
                sender=sender,
                category=NotificationCategory.VERIFICATION,
                notification_type='HOD_APPROVED',
                title=f"Pending Final IQAC: {activity.title}",
                body=f"HOD approved '{activity.title}' from {activity.department.name}. Ready for final IQAC verification.",
                priority=NotificationPriority.NORMAL,
                action_url=f"/iqac/verification/{activity.id}",
                action_label="Verify Evidence",
                related_model='Activity',
                related_id=activity.id,
                college=activity.college,
                deduplication_key=f"act_{activity.id}_hod_approved",
                metadata={'hod_name': sender.get_full_name(), 'activity_title': activity.title}
            )

    @staticmethod
    def notify_on_hod_rejection(activity, sender, reason):
        """HOD rejects -> Notify Department In-charge."""
        incharges = User.objects.filter(
            college=activity.college,
            department=activity.department,
            role=UserRole.DEPARTMENT_INCHARGE,
            is_active=True
        )
        for inc in incharges:
            NotificationDispatcher.dispatch(
                recipient=inc,
                sender=sender,
                category=NotificationCategory.VERIFICATION,
                notification_type='RETURNED_BY_HOD',
                title=f"Returned by HOD: {activity.title}",
                body=f"HOD returned submission with remark: \"{reason}\".",
                priority=NotificationPriority.HIGH,
                action_url=f"/incharge/verification/{activity.id}",
                action_label="Review Feedback",
                related_model='Activity',
                related_id=activity.id,
                college=activity.college,
                deduplication_key=f"act_{activity.id}_hod_rejected_{timezone.now().date()}",
                metadata={'reason': reason, 'activity_title': activity.title}
            )

    @staticmethod
    def notify_on_iqac_approval(activity, sender):
        """IQAC approves -> Notify Faculty owner and Department Leadership."""
        # Faculty
        NotificationDispatcher.dispatch(
            recipient=activity.faculty,
            sender=sender,
            category=NotificationCategory.EVIDENCE,
            notification_type='VERIFIED_EVIDENCE',
            title=f"Officially Verified: {activity.title}",
            body="Congratulations! Your activity has been approved by IQAC and cataloged into institutional evidence.",
            priority=NotificationPriority.NORMAL,
            action_url=f"/faculty/submissions/{activity.id}",
            action_label="View Evidence",
            related_model='Activity',
            related_id=activity.id,
            college=activity.college,
            deduplication_key=f"act_{activity.id}_iqac_approved",
            metadata={'activity_title': activity.title}
        )
        # HOD & In-charge
        leaders = User.objects.filter(
            college=activity.college,
            department=activity.department,
            role__in=[UserRole.HOD, UserRole.DEPARTMENT_INCHARGE],
            is_active=True
        )
        for leader in leaders:
            NotificationDispatcher.dispatch(
                recipient=leader,
                sender=sender,
                category=NotificationCategory.EVIDENCE,
                notification_type='VERIFIED_EVIDENCE_DEPT',
                title=f"Evidence Sealed: {activity.title}",
                body=f"Activity by {activity.faculty.get_full_name()} has received final IQAC verification.",
                priority=NotificationPriority.LOW,
                action_url=f"/iqac/evidence",
                action_label="Repository View",
                related_model='Activity',
                related_id=activity.id,
                college=activity.college,
                deduplication_key=f"act_{activity.id}_iqac_sealed_dept_{leader.id}",
                metadata={'activity_title': activity.title}
            )

    @staticmethod
    def notify_on_iqac_rejection(activity, sender, reason, target_role='DEPARTMENT_INCHARGE'):
        """IQAC rejects -> Notify target role / Faculty."""
        if target_role == 'FACULTY':
            recipients = [activity.faculty]
        else:
            recipients = User.objects.filter(
                college=activity.college,
                department=activity.department,
                role=target_role,
                is_active=True
            )
        for r in recipients:
            NotificationDispatcher.dispatch(
                recipient=r,
                sender=sender,
                category=NotificationCategory.VERIFICATION,
                notification_type='RETURNED_BY_IQAC',
                title=f"IQAC Returned: {activity.title}",
                body=f"IQAC returned submission with remark: \"{reason}\".",
                priority=NotificationPriority.HIGH,
                action_url=f"/faculty/activities/{activity.id}/edit" if target_role == 'FACULTY' else f"/incharge/verification/{activity.id}",
                action_label="Fix & Resubmit",
                related_model='Activity',
                related_id=activity.id,
                college=activity.college,
                deduplication_key=f"act_{activity.id}_iqac_rejected_{timezone.now().date()}_{r.id}",
                metadata={'reason': reason, 'activity_title': activity.title}
            )


class TaskService:
    """
    Manages lightweight IQAC task lifecycle, assignments, transitions, and activity audits.
    """

    @staticmethod
    def create_task(
        college,
        title,
        owner,
        creator=None,
        description='',
        department=None,
        academic_year=None,
        priority=TaskPriority.NORMAL,
        due_date=None,
        related_metric=None,
        related_evidence=None,
        related_data_request=None,
        deduplication_key='',
        is_automated=False,
    ):
        """
        Creates an IQAC task with deduplication safety.
        """
        if deduplication_key:
            existing = IQACTask.objects.filter(
                college=college,
                deduplication_key=deduplication_key,
                status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]
            ).first()
            if existing:
                return existing

        dept = department or getattr(owner, 'department', None)

        task = IQACTask.objects.create(
            college=college,
            title=title,
            description=description,
            owner=owner,
            creator=creator,
            department=dept,
            academic_year=academic_year,
            priority=priority,
            due_date=due_date,
            status=TaskStatus.TODO,
            related_metric=related_metric,
            related_evidence=related_evidence,
            related_data_request=related_data_request,
            deduplication_key=deduplication_key,
            is_automated=is_automated,
        )

        # Audit history
        TaskActivity.objects.create(
            task=task,
            actor=creator,
            action=TaskActivityAction.CREATED,
            details=f"Task created and assigned to {owner.get_full_name()} ({owner.email})."
        )

        # Notify assignee
        NotificationDispatcher.dispatch(
            recipient=owner,
            sender=creator,
            category=NotificationCategory.TASK,
            notification_type='TASK_ASSIGNED',
            title=f"Task Assigned: {title}",
            body=f"You have been assigned task: '{title}' by {creator.get_full_name() if creator else 'System'}. Due: {due_date or 'No deadline'}.",
            priority=priority,
            action_url=f"/notifications",
            action_label="View Task",
            related_model='IQACTask',
            related_id=task.id,
            college=college,
            deduplication_key=f"task_{task.id}_assigned",
            metadata={'task_title': title, 'due_date': str(due_date)}
        )

        return task

    @staticmethod
    def update_status(task, new_status, actor, comment=''):
        """Transitions task status with audit history and notification."""
        old_status = task.status
        if old_status == new_status:
            return task

        task.status = new_status
        if new_status == TaskStatus.COMPLETED:
            task.completed_at = timezone.now()
            task.completed_by = actor
        elif new_status == TaskStatus.TODO and old_status == TaskStatus.COMPLETED:
            task.completed_at = None
            task.completed_by = None

        task.save()

        # Map action
        action_map = {
            TaskStatus.IN_PROGRESS: TaskActivityAction.STARTED,
            TaskStatus.COMPLETED: TaskActivityAction.COMPLETED,
            TaskStatus.BLOCKED: TaskActivityAction.UPDATED,
            TaskStatus.CANCELLED: TaskActivityAction.CANCELLED,
            TaskStatus.TODO: TaskActivityAction.REOPENED,
        }
        action = action_map.get(new_status, TaskActivityAction.UPDATED)

        details = f"Status changed from {old_status} to {new_status}."
        if comment:
            details += f" Comment: {comment}"

        TaskActivity.objects.create(
            task=task,
            actor=actor,
            action=action,
            details=details
        )

        # Notify creator if actor is owner, or notify owner if actor is creator
        notify_target = task.creator if actor == task.owner else task.owner
        if notify_target and notify_target != actor:
            NotificationDispatcher.dispatch(
                recipient=notify_target,
                sender=actor,
                category=NotificationCategory.TASK,
                notification_type='TASK_STATUS_UPDATED',
                title=f"Task {new_status}: {task.title}",
                body=f"{actor.get_full_name()} marked task '{task.title}' as {new_status}.",
                priority=NotificationPriority.NORMAL,
                action_url="/notifications",
                action_label="Open Tasks",
                related_model='IQACTask',
                related_id=task.id,
                college=task.college,
                deduplication_key=f"task_{task.id}_{new_status}_{timezone.now().timestamp()}"
            )

        return task

    @staticmethod
    def add_comment(task, author, comment_text='', comment=''):
        """Adds a discussion comment to a task."""
        text = comment_text or comment
        comment_obj = TaskComment.objects.create(
            task=task,
            author=author,
            comment=text
        )

        TaskActivity.objects.create(
            task=task,
            actor=author,
            action=TaskActivityAction.COMMENTED,
            details=f"Comment: {text[:100]}..."
        )

        # Notify the other party
        notify_target = task.creator if author == task.owner else task.owner
        if notify_target and notify_target != author:
            NotificationDispatcher.dispatch(
                recipient=notify_target,
                sender=author,
                category=NotificationCategory.TASK,
                notification_type='TASK_COMMENT_ADDED',
                title=f"New Comment on Task: {task.title}",
                body=f"{author.get_full_name()} commented: \"{text[:120]}\"",
                priority=NotificationPriority.NORMAL,
                action_url="/notifications",
                action_label="Open Task",
                related_model='IQACTask',
                related_id=task.id,
                college=task.college,
                deduplication_key=f"task_{task.id}_comment_{comment_obj.id}"
            )

        return comment_obj


class DeadlineService:
    """
    Calculates task deadlines and groups them into operational time horizons.
    """

    @classmethod
    def get_deadlines(cls, user, college=None):
        """Returns categorized deadlines for tasks visible to user."""
        col = college or getattr(user, 'college', None)
        today = timezone.now().date()
        tomorrow = today + datetime.timedelta(days=1)
        end_of_week = today + datetime.timedelta(days=7)

        qs = IQACTask.objects.filter(college=col).exclude(status__in=[TaskStatus.COMPLETED, TaskStatus.CANCELLED])
        if user.role == UserRole.FACULTY:
            qs = qs.filter(owner=user)
        elif user.role in [UserRole.HOD, UserRole.DEPARTMENT_INCHARGE] and user.department:
            qs = qs.filter(Q(owner=user) | Q(department=user.department))

        due_today = qs.filter(due_date=today)
        due_tomorrow = qs.filter(due_date=tomorrow)
        due_this_week = qs.filter(due_date__gte=today, due_date__lte=end_of_week)
        overdue = qs.filter(due_date__lt=today)
        upcoming = qs.filter(due_date__gt=end_of_week)

        return {
            'due_today': list(due_today.values('id', 'title', 'due_date', 'priority')),
            'due_tomorrow': list(due_tomorrow.values('id', 'title', 'due_date', 'priority')),
            'due_this_week': list(due_this_week.values('id', 'title', 'due_date', 'priority')),
            'overdue': list(overdue.values('id', 'title', 'due_date', 'priority')),
            'upcoming': list(upcoming.values('id', 'title', 'due_date', 'priority')),
            'today_count': due_today.count(),
            'tomorrow_count': due_tomorrow.count(),
            'this_week_count': due_this_week.count(),
            'overdue_count': overdue.count(),
            'total_active_tasks': qs.count(),
        }

    @classmethod
    def get_deadline_breakdown(cls, user, college=None):
        col = college or getattr(user, 'college', None)
        return cls.get_deadlines(user, col)


class ReminderAndEscalationEngine:
    """
    Automated reminder scheduler and multi-tier queue escalation engine.
    Adheres strictly to human review invariants (escalations notify, NEVER approve).
    """

    @classmethod
    def process_deadline_reminders(cls, college):
        today = timezone.now().date()
        reminders_sent = 0

        # Tasks due in 3 days
        three_days = today + datetime.timedelta(days=3)
        tasks_3d = IQACTask.objects.filter(
            college=college,
            due_date=three_days,
            status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        )
        for t in tasks_3d:
            n = NotificationDispatcher.dispatch(
                recipient=t.owner,
                category=NotificationCategory.DEADLINE,
                notification_type='TASK_DUE_SOON',
                title=f"Deadline Approaching in 3 Days: {t.title}",
                body=f"Task '{t.title}' is due on {t.due_date}. Please complete required activities.",
                priority=TaskPriority.NORMAL,
                action_url="/notifications",
                action_label="Review Task",
                related_model='IQACTask',
                related_id=t.id,
                college=college,
                deduplication_key=f"task_{t.id}_remind_3d_{today}"
            )
            if n:
                reminders_sent += 1

        # Tasks due tomorrow
        one_day = today + datetime.timedelta(days=1)
        tasks_1d = IQACTask.objects.filter(
            college=college,
            due_date=one_day,
            status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        )
        for t in tasks_1d:
            n = NotificationDispatcher.dispatch(
                recipient=t.owner,
                category=NotificationCategory.DEADLINE,
                notification_type='TASK_DUE_SOON',
                title=f"URGENT: Task Due Tomorrow: {t.title}",
                body=f"Task '{t.title}' is due tomorrow ({t.due_date}). Action required.",
                priority=NotificationPriority.HIGH,
                action_url="/notifications",
                action_label="Complete Task",
                related_model='IQACTask',
                related_id=t.id,
                college=college,
                deduplication_key=f"task_{t.id}_remind_1d_{today}"
            )
            if n:
                reminders_sent += 1

        return reminders_sent

    @classmethod
    def process_overdue_escalations(cls, college):
        today = timezone.now().date()
        escalations_sent = 0
        overdue_tasks = IQACTask.objects.filter(
            college=college,
            due_date__lt=today,
            status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]
        )
        for t in overdue_tasks:
            days_overdue = (today - t.due_date).days
            NotificationDispatcher.dispatch(
                recipient=t.owner,
                category=NotificationCategory.DEADLINE,
                notification_type='TASK_OVERDUE',
                title=f"Overdue Task ({days_overdue}d): {t.title}",
                body=f"This task was due on {t.due_date} ({days_overdue} days ago). Please resolve immediately.",
                priority=NotificationPriority.URGENT if days_overdue >= 3 else NotificationPriority.HIGH,
                action_url="/notifications",
                action_label="Resolve Overdue Task",
                related_model='IQACTask',
                related_id=t.id,
                college=college,
                deduplication_key=f"task_{t.id}_overdue_owner_{today}"
            )

            # Supervisor escalation
            supervisor = None
            if t.owner.role == UserRole.FACULTY and t.department:
                supervisor = User.objects.filter(college=college, department=t.department, role=UserRole.DEPARTMENT_INCHARGE, is_active=True).first()
            elif t.owner.role == UserRole.DEPARTMENT_INCHARGE and t.department:
                supervisor = User.objects.filter(college=college, department=t.department, role=UserRole.HOD, is_active=True).first()
            elif t.owner.role == UserRole.HOD:
                supervisor = User.objects.filter(college=college, role=UserRole.IQAC, is_active=True).first()

            if supervisor and supervisor != t.owner:
                n_esc = NotificationDispatcher.dispatch(
                    recipient=supervisor,
                    category=NotificationCategory.DEADLINE,
                    notification_type='TASK_OVERDUE_SUPERVISOR',
                    title=f"Escalation: Task Overdue by {days_overdue} Days",
                    body=f"Task '{t.title}' assigned to {t.owner.get_full_name()} is {days_overdue} days overdue.",
                    priority=NotificationPriority.HIGH,
                    action_url="/notifications",
                    action_label="View Escalation",
                    related_model='IQACTask',
                    related_id=t.id,
                    college=college,
                    deduplication_key=f"task_{t.id}_esc_{supervisor.id}_{today}"
                )
                if n_esc:
                    escalations_sent += 1
        return escalations_sent

    @classmethod
    def process_verification_stalls(cls, college):
        today = timezone.now().date()
        stalls = 0
        three_days_ago = timezone.now() - datetime.timedelta(days=3)
        stalled = Activity.objects.filter(
            college=college,
            status__in=[ActivityStatus.PENDING_INCHARGE, ActivityStatus.PENDING_HOD],
            updated_at__lte=three_days_ago
        )
        for act in stalled:
            days = (timezone.now() - act.updated_at).days
            if act.status == ActivityStatus.PENDING_INCHARGE:
                incs = User.objects.filter(college=college, department=act.department, role=UserRole.DEPARTMENT_INCHARGE, is_active=True)
                for inc in incs:
                    n = NotificationDispatcher.dispatch(
                        recipient=inc,
                        category=NotificationCategory.VERIFICATION,
                        notification_type='VERIFICATION_STALLED',
                        title=f"Queue Alert: In-charge Verification Pending {days} Days",
                        body=f"Submission '{act.title}' by {act.faculty.get_full_name()} awaiting review for {days} days.",
                        priority=NotificationPriority.HIGH,
                        action_url=f"/incharge/verification/{act.id}",
                        college=college,
                        deduplication_key=f"act_{act.id}_stall_inc_{today}"
                    )
                    if n:
                        stalls += 1
            elif act.status == ActivityStatus.PENDING_HOD:
                hods = User.objects.filter(college=college, department=act.department, role=UserRole.HOD, is_active=True)
                for hod in hods:
                    n = NotificationDispatcher.dispatch(
                        recipient=hod,
                        category=NotificationCategory.VERIFICATION,
                        notification_type='VERIFICATION_STALLED',
                        title=f"Queue Alert: HOD Approval Pending {days} Days",
                        body=f"Submission '{act.title}' from {act.department.name} awaiting review for {days} days.",
                        priority=NotificationPriority.HIGH,
                        action_url=f"/hod/verification/{act.id}",
                        college=college,
                        deduplication_key=f"act_{act.id}_stall_hod_{today}"
                    )
                    if n:
                        stalls += 1
        return stalls

    @classmethod
    def evaluate_reminders_and_escalations(cls, college):
        rem = cls.process_deadline_reminders(college)
        esc = cls.process_overdue_escalations(college)
        stalls = cls.process_verification_stalls(college)
        return {'reminders_sent': rem, 'escalations_sent': esc, 'stalls': stalls}


class AutomationEngine:
    """
    Executes automation rules.
    STRICT SAFETY INVARIANT: Rules CANNOT approve/verify evidence, alter verification statuses,
    or bypass approval hierarchies.
    """

    @classmethod
    def execute_action(cls, rule, context=None):
        forbidden_actions = [
            'AUTO_VERIFY_EVIDENCE',
            'APPROVE_EVIDENCE',
            'VERIFY_EVIDENCE',
            'BYPASS_APPROVAL',
            'ALTER_VERIFICATION_STATUS',
            'CHANGE_PERMISSIONS',
            'DELETE_RECORDS',
        ]
        if rule.action in forbidden_actions:
            return False

        college = rule.college
        cfg = rule.action_config or {}

        if rule.action == 'CREATE_TASK':
            iqac_admin = User.objects.filter(college=college, role=UserRole.IQAC, is_active=True).first()
            owner = User.objects.filter(college=college, role=UserRole.DEPARTMENT_INCHARGE, is_active=True).first()
            if not owner:
                owner = iqac_admin
            if not owner:
                return False

            days_due = cfg.get('days_due', 7)
            due_date = timezone.now().date() + datetime.timedelta(days=days_due)

            TaskService.create_task(
                college=college,
                title=cfg.get('title', rule.name),
                description=cfg.get('description', rule.description),
                owner=owner,
                creator=iqac_admin,
                priority=cfg.get('priority', TaskPriority.NORMAL),
                due_date=due_date,
                is_automated=True,
                deduplication_key=f"rule_task_{rule.id}_{timezone.now().date()}"
            )
            return True

        elif rule.action == 'NOTIFY_INCHARGE':
            incharges = User.objects.filter(college=college, role=UserRole.DEPARTMENT_INCHARGE, is_active=True)
            for inc in incharges:
                NotificationDispatcher.dispatch(
                    recipient=inc,
                    category=NotificationCategory.SYSTEM,
                    notification_type='AUTOMATION_ALERT',
                    title=rule.name,
                    body=rule.description or "Automated notification.",
                    college=college,
                    deduplication_key=f"rule_notif_{rule.id}_{inc.id}_{timezone.now().date()}"
                )
            return True

        return False

    @classmethod
    def evaluate_rules(cls, college):
        rules = AutomationRule.objects.filter(college=college, is_active=True)
        executed_count = 0
        for rule in rules:
            if rule.last_triggered_at:
                cooldown_delta = datetime.timedelta(hours=rule.cooldown_hours)
                if timezone.now() - rule.last_triggered_at < cooldown_delta:
                    continue
            success = cls.execute_action(rule)
            if success:
                rule.last_triggered_at = timezone.now()
                rule.save()
                executed_count += 1
        return executed_count

    @classmethod
    def run_evaluations(cls, college):
        return cls.evaluate_rules(college)


class WorkQueueService:
    @classmethod
    def _resolve(cls, college_or_user, user=None):
        if user is None and hasattr(college_or_user, 'college'):
            return college_or_user.college, college_or_user
        return college_or_user, user

    @classmethod
    def get_iqac_work_queue(cls, college, user=None):
        """IQAC operational command queue."""
        college, user = cls._resolve(college, user)
        # 1. Pending verifications awaiting final IQAC review
        pending_verifications = Activity.objects.filter(
            college=college,
            status=ActivityStatus.PENDING_IQAC
        ).select_related('faculty', 'department', 'category').order_by('created_at')[:15]

        # 2. Evidence gaps (Metrics with 0 evidence)
        mapped_metric_ids = EvidenceMapping.objects.filter(college=college, status='ACTIVE').values_list('metric_id', flat=True)
        metric_gaps = Metric.objects.filter(college=college, is_active=True).exclude(id__in=mapped_metric_ids).select_related('criterion')[:10]

        # 3. Tasks assigned to or created by IQAC
        tasks = IQACTask.objects.filter(
            college=college,
            status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]
        ).select_related('owner', 'department').order_by('due_date')[:15]

        pv_list = [
            {
                'id': str(a.id),
                'title': a.title,
                'faculty_name': a.faculty.get_full_name(),
                'department_name': a.department.name if a.department else '',
                'category_name': a.category.name if a.category else 'General',
                'days_pending': (timezone.now() - a.updated_at).days,
                'action_url': f"/iqac/verification/{a.id}",
            } for a in pending_verifications
        ]
        gaps_list = [
            {
                'metric_id': str(m.id),
                'metric_number': m.number,
                'metric_title': m.title,
                'criterion_number': m.criterion.number if m.criterion else '',
                'action_url': f"/iqac/metrics/{m.id}",
            } for m in metric_gaps
        ]
        tasks_list = [
            {
                'id': str(t.id),
                'title': t.title,
                'owner_name': t.owner.get_full_name(),
                'department_name': t.department.name if t.department else 'All',
                'priority': t.priority,
                'due_date': str(t.due_date) if t.due_date else None,
                'is_overdue': t.is_overdue,
                'status': t.status,
            } for t in tasks
        ]
        overdue_tasks = [t for t in tasks_list if t.get('is_overdue')]

        return {
            'counts': {
                'pending_verifications': pending_verifications.count(),
                'evidence_gaps': metric_gaps.count(),
                'tasks': tasks.count(),
                'overdue_tasks': len(overdue_tasks),
            },
            'pending_verifications_count': pending_verifications.count(),
            'pending_verifications': pv_list,
            'metric_gaps_count': metric_gaps.count(),
            'metric_gaps': gaps_list,
            'evidence_gaps': gaps_list,
            'active_tasks_count': tasks.count(),
            'active_tasks': tasks_list,
            'tasks': tasks_list,
            'overdue_tasks': overdue_tasks,
        }

    @classmethod
    def get_hod_work_queue(cls, college, user=None):
        """HOD departmental operational queue."""
        college, user = cls._resolve(college, user)
        dept = user.department
        if not dept:
            return {
                'counts': {'pending_verifications': 0, 'returned': 0, 'tasks': 0},
                'pending_verifications': [],
                'department_tasks': [],
                'tasks': [],
                'returned_records': [],
                'returned': []
            }

        # 1. Pending HOD verifications
        pending = Activity.objects.filter(
            college=college,
            department=dept,
            status=ActivityStatus.PENDING_HOD
        ).select_related('faculty', 'category').order_by('created_at')

        # 2. Returned records needing department resolution
        returned = Activity.objects.filter(
            college=college,
            department=dept,
            status__in=[ActivityStatus.RETURNED_TO_INCHARGE, ActivityStatus.REJECTED_HOD, ActivityStatus.REJECTED_IQAC]
        ).select_related('faculty', 'category')[:10]

        # 3. Department tasks
        dept_tasks = IQACTask.objects.filter(
            college=college,
            department=dept,
            status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]
        ).select_related('owner').order_by('due_date')[:15]

        p_list = [
            {
                'id': str(a.id),
                'title': a.title,
                'faculty_name': a.faculty.get_full_name(),
                'category_name': a.category.name if a.category else 'General',
                'days_pending': (timezone.now() - a.updated_at).days,
                'action_url': f"/hod/verification/{a.id}",
            } for a in pending
        ]
        r_list = [
            {
                'id': str(a.id),
                'title': a.title,
                'faculty_name': a.faculty.get_full_name(),
                'status': a.status,
                'action_url': f"/hod/verification/{a.id}",
            } for a in returned
        ]
        t_list = [
            {
                'id': str(t.id),
                'title': t.title,
                'owner_name': t.owner.get_full_name(),
                'priority': t.priority,
                'due_date': str(t.due_date) if t.due_date else None,
                'is_overdue': t.is_overdue,
                'status': t.status,
            } for t in dept_tasks
        ]

        return {
            'department_code': dept.code,
            'department_name': dept.name,
            'counts': {
                'pending_verifications': pending.count(),
                'returned': returned.count(),
                'tasks': dept_tasks.count(),
            },
            'pending_verifications_count': pending.count(),
            'pending_verifications': p_list,
            'returned_records_count': returned.count(),
            'returned_records': r_list,
            'returned': r_list,
            'department_tasks_count': dept_tasks.count(),
            'department_tasks': t_list,
            'tasks': t_list,
        }

    @classmethod
    def get_incharge_work_queue(cls, college, user=None):
        """Department In-charge operational queue."""
        college, user = cls._resolve(college, user)
        dept = user.department
        if not dept:
            return {
                'counts': {'submissions': 0, 'returned': 0, 'tasks': 0},
                'pending_submissions': [],
                'submissions': [],
                'returned_records': [],
                'returned': [],
                'tasks': []
            }

        # 1. Submissions awaiting in-charge verification
        pending = Activity.objects.filter(
            college=college,
            department=dept,
            status=ActivityStatus.PENDING_INCHARGE
        ).select_related('faculty', 'category').order_by('created_at')

        # 2. Returned records awaiting faculty/incharge correction
        returned = Activity.objects.filter(
            college=college,
            department=dept,
            status__in=[ActivityStatus.RETURNED_TO_FACULTY, ActivityStatus.RETURNED_TO_INCHARGE]
        ).select_related('faculty', 'category')[:10]

        # 3. Tasks assigned to in-charge or department
        tasks = IQACTask.objects.filter(
            college=college,
            department=dept,
            status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]
        ).select_related('owner').order_by('due_date')[:15]

        s_list = [
            {
                'id': str(a.id),
                'title': a.title,
                'faculty_name': a.faculty.get_full_name(),
                'category_name': a.category.name if a.category else 'General',
                'days_pending': (timezone.now() - a.updated_at).days,
                'action_url': f"/incharge/verification/{a.id}",
            } for a in pending
        ]
        r_list = [
            {
                'id': str(a.id),
                'title': a.title,
                'faculty_name': a.faculty.get_full_name(),
                'status': a.status,
                'action_url': f"/incharge/verification/{a.id}",
            } for a in returned
        ]
        t_list = [
            {
                'id': str(t.id),
                'title': t.title,
                'owner_name': t.owner.get_full_name(),
                'priority': t.priority,
                'due_date': str(t.due_date) if t.due_date else None,
                'is_overdue': t.is_overdue,
                'status': t.status,
            } for t in tasks
        ]

        return {
            'department_code': dept.code,
            'department_name': dept.name,
            'counts': {
                'submissions': pending.count(),
                'returned': returned.count(),
                'tasks': tasks.count(),
            },
            'pending_submissions_count': pending.count(),
            'pending_submissions': s_list,
            'submissions': s_list,
            'returned_records_count': returned.count(),
            'returned_records': r_list,
            'returned': r_list,
            'tasks_count': tasks.count(),
            'tasks': t_list,
        }

    @classmethod
    def get_faculty_workspace(cls, college, user=None):
        """Faculty personal workspace and output tracker."""
        college, user = cls._resolve(college, user)
        acts = Activity.objects.filter(college=college, faculty=user)
        drafts = acts.filter(status=ActivityStatus.DRAFT)
        pending = acts.filter(status__in=[
            ActivityStatus.PENDING_INCHARGE,
            ActivityStatus.INCHARGE_VERIFIED,
            ActivityStatus.PENDING_HOD,
            ActivityStatus.HOD_APPROVED,
            ActivityStatus.PENDING_IQAC
        ])
        returned = acts.filter(status__in=[
            ActivityStatus.RETURNED_TO_FACULTY,
            ActivityStatus.REJECTED_INCHARGE,
            ActivityStatus.REJECTED_HOD,
            ActivityStatus.REJECTED_IQAC
        ])
        verified = Evidence.objects.filter(college=college, faculty=user, is_verified=True)

        # Personal tasks
        tasks = IQACTask.objects.filter(
            college=college,
            owner=user,
            status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]
        ).order_by('due_date')

        # Recent unread notifications
        notifs = Notification.objects.filter(recipient=user, is_read=False).order_by('-created_at')[:5]

        d_list = [{'id': str(d.id), 'title': d.title, 'created_at': d.created_at.isoformat()} for d in drafts[:5]]
        p_list = [{'id': str(p.id), 'title': p.title, 'status': p.status, 'category_name': p.category.name if p.category else 'General', 'updated_at': p.updated_at.isoformat()} for p in pending[:5]]
        r_list = [{'id': str(r.id), 'title': r.title, 'status': r.status, 'category_name': r.category.name if r.category else 'General', 'edit_url': f"/faculty/activities/{r.id}/edit"} for r in returned[:5]]
        v_list = [{'id': str(v.id), 'title': v.title, 'category_name': 'Verified Evidence'} for v in verified[:5]]
        t_list = [
            {
                'id': str(t.id),
                'title': t.title,
                'priority': t.priority,
                'due_date': str(t.due_date) if t.due_date else None,
                'is_overdue': t.is_overdue,
                'status': t.status,
            } for t in tasks
        ]

        return {
            'counts': {
                'drafts': drafts.count(),
                'submissions': pending.count(),
                'returned': returned.count(),
                'verified': verified.count(),
                'tasks': tasks.count(),
            },
            'drafts_count': drafts.count(),
            'drafts': d_list,
            'pending_count': pending.count(),
            'pending_submissions': p_list,
            'submissions': p_list,
            'returned_count': returned.count(),
            'returned_submissions': r_list,
            'returned': r_list,
            'verified_evidence_count': verified.count(),
            'verified': v_list,
            'tasks_count': tasks.count(),
            'assigned_tasks': t_list,
            'tasks': t_list,
            'unread_notifications': [
                {
                    'id': str(n.id),
                    'title': n.title,
                    'category': n.category,
                    'priority': n.priority,
                    'action_url': n.action_url,
                    'created_at': n.created_at.isoformat(),
                } for n in notifs
            ]
        }

    @classmethod
    def get_my_work(cls, user_or_college, college_or_user=None):
        """Role-aware unified personal action items."""
        if hasattr(user_or_college, 'role'):
            user = user_or_college
            college = college_or_user or getattr(user, 'college', None)
        else:
            college = user_or_college
            user = college_or_user

        role = user.role
        items = []

        # 1. Personal Tasks for everyone
        personal_tasks = IQACTask.objects.filter(
            college=college,
            owner=user,
            status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]
        ).order_by('due_date')[:10]

        for t in personal_tasks:
            items.append({
                'id': str(t.id),
                'item_type': 'TASK',
                'title': t.title,
                'priority': t.priority,
                'due_date': str(t.due_date) if t.due_date else None,
                'is_overdue': t.is_overdue,
                'status': t.status,
                'action_url': f"/notifications",
                'action_label': "Open Task"
            })

        # 2. Role-specific items
        if role == UserRole.FACULTY:
            returned = Activity.objects.filter(
                college=college, faculty=user,
                status__in=[ActivityStatus.RETURNED_TO_FACULTY, ActivityStatus.REJECTED_INCHARGE, ActivityStatus.REJECTED_HOD]
            )[:5]
            for r in returned:
                items.append({
                    'id': str(r.id),
                    'item_type': 'RETURNED_RECORD',
                    'title': f"Returned Submission: {r.title}",
                    'priority': 'HIGH',
                    'due_date': None,
                    'is_overdue': False,
                    'status': r.status,
                    'action_url': f"/faculty/activities/{r.id}/edit",
                    'action_label': "Edit & Resubmit"
                })

        elif role == UserRole.DEPARTMENT_INCHARGE and user.department:
            pending_inc = Activity.objects.filter(
                college=college, department=user.department,
                status=ActivityStatus.PENDING_INCHARGE
            )[:10]
            for p in pending_inc:
                items.append({
                    'id': str(p.id),
                    'item_type': 'VERIFICATION_QUEUE',
                    'title': f"Verify: {p.title} ({p.faculty.get_full_name()})",
                    'priority': 'NORMAL',
                    'due_date': None,
                    'is_overdue': False,
                    'status': p.status,
                    'action_url': f"/incharge/verification/{p.id}",
                    'action_label': "Verify Record"
                })

        elif role == UserRole.HOD and user.department:
            pending_hod = Activity.objects.filter(
                college=college, department=user.department,
                status=ActivityStatus.PENDING_HOD
            )[:10]
            for p in pending_hod:
                items.append({
                    'id': str(p.id),
                    'item_type': 'APPROVAL_QUEUE',
                    'title': f"Approve: {p.title} ({p.faculty.get_full_name()})",
                    'priority': 'NORMAL',
                    'due_date': None,
                    'is_overdue': False,
                    'status': p.status,
                    'action_url': f"/hod/verification/{p.id}",
                    'action_label': "Approve Submission"
                })

        elif role in [UserRole.IQAC, UserRole.SUPER_ADMIN]:
            pending_iqac = Activity.objects.filter(
                college=college, status=ActivityStatus.PENDING_IQAC
            )[:10]
            for p in pending_iqac:
                items.append({
                    'id': str(p.id),
                    'item_type': 'FINAL_VERIFICATION_QUEUE',
                    'title': f"Final IQAC Verify: {p.title} ({p.department.code})",
                    'priority': 'NORMAL',
                    'due_date': None,
                    'is_overdue': False,
                    'status': p.status,
                    'action_url': f"/iqac/verification/{p.id}",
                    'action_label': "Verify Evidence"
                })

        return {
            'user_role': role,
            'total_items_count': len(items),
            'items': items
        }
