import datetime
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User, UserRole
from apps.notifications.models import (
    Notification,
    NotificationPreference,
    NotificationTemplate,
    IQACTask,
    TaskStatus,
    TaskPriority,
    TaskActivity,
    TaskComment,
    AutomationRule,
)
from apps.notifications.serializers import (
    NotificationSerializer,
    NotificationPreferenceSerializer,
    NotificationTemplateSerializer,
    IQACTaskSerializer,
    TaskActivitySerializer,
    TaskCommentSerializer,
    AutomationRuleSerializer,
)
from apps.notifications.services import (
    TaskService,
    DeadlineService,
    ReminderAndEscalationEngine,
    AutomationEngine,
    WorkQueueService,
)


class NotificationViewSet(viewsets.ModelViewSet):
    """
    Central Notification Center API with categorization, unread filters,
    bulk mark-as-read, unread count, and user preferences.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Notification.objects.filter(recipient=user)
        if user.college:
            qs = qs.filter(college=user.college)

        # Filters
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)

        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)

        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            if is_read.lower() in ('true', '1'):
                qs = qs.filter(is_read=True)
            elif is_read.lower() in ('false', '0'):
                qs = qs.filter(is_read=False)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(body__icontains=search))

        return qs.order_by('-created_at')

    @action(detail=True, methods=['patch', 'post'], url_path='read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        return Response({'status': 'marked as read', 'id': notification.id})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        user = request.user
        updated_count = Notification.objects.filter(recipient=user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response({'status': 'all notifications marked as read', 'updated_count': updated_count})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        user = request.user
        count = Notification.objects.filter(recipient=user, is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=False, methods=['get', 'post', 'patch'], url_path='preferences')
    def user_preferences(self, request):
        user = request.user
        pref, _ = NotificationPreference.objects.get_or_create(user=user)

        if request.method in ['POST', 'PATCH']:
            serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = NotificationPreferenceSerializer(pref)
        return Response(serializer.data)


class IQACTaskViewSet(viewsets.ModelViewSet):
    """
    Lightweight IQAC task management with RBAC, lifecycle transitions,
    comments, audit activity timeline, and deadline categorization.
    """
    serializer_class = IQACTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.college and user.role != UserRole.SUPER_ADMIN:
            return IQACTask.objects.none()

        qs = IQACTask.objects.all()
        if user.college:
            qs = qs.filter(college=user.college)

        # Role-based visibility scoping
        if user.role in [UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT, UserRole.IQAC]:
            # Institutional visibility
            pass
        elif user.role in [UserRole.HOD, UserRole.DEPARTMENT_INCHARGE]:
            # Scoped to department or assigned to self or created by self
            dept_q = Q(department=user.department) if user.department else Q()
            qs = qs.filter(dept_q | Q(owner=user) | Q(creator=user))
        elif user.role == UserRole.FACULTY:
            # Strictly personal tasks
            qs = qs.filter(Q(owner=user) | Q(creator=user))

        # Query Filters
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)

        dept_id = self.request.query_params.get('department')
        if dept_id:
            qs = qs.filter(department_id=dept_id)

        owner_id = self.request.query_params.get('owner')
        if owner_id:
            qs = qs.filter(owner_id=owner_id)

        metric_id = self.request.query_params.get('metric')
        if metric_id:
            qs = qs.filter(related_metric_id=metric_id)

        academic_year = self.request.query_params.get('academic_year')
        if academic_year:
            qs = qs.filter(academic_year_id=academic_year)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))

        return qs.select_related(
            'owner', 'creator', 'department', 'academic_year', 'related_metric', 'related_evidence'
        ).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == UserRole.COLLEGE_MANAGEMENT:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("College Management has read-only oversight.")

        # If department not provided, fallback to owner's department
        owner = serializer.validated_data.get('owner')
        dept = serializer.validated_data.get('department')
        if not dept and owner:
            dept = getattr(owner, 'department', None)

        task = TaskService.create_task(
            college=user.college,
            title=serializer.validated_data['title'],
            owner=owner,
            creator=user,
            description=serializer.validated_data.get('description', ''),
            department=dept,
            academic_year=serializer.validated_data.get('academic_year'),
            priority=serializer.validated_data.get('priority', TaskPriority.NORMAL),
            due_date=serializer.validated_data.get('due_date'),
            related_metric=serializer.validated_data.get('related_metric'),
            related_evidence=serializer.validated_data.get('related_evidence'),
            related_data_request=serializer.validated_data.get('related_data_request'),
            deduplication_key=serializer.validated_data.get('deduplication_key', ''),
        )
        serializer.instance = task

    def perform_update(self, serializer):
        user = self.request.user
        if user.role == UserRole.COLLEGE_MANAGEMENT:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("College Management has read-only oversight.")
        task = self.get_object()
        # Ensure user is authorized to edit
        if user.role == UserRole.FACULTY and task.creator != user and task.owner != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only modify your own tasks.")

        updated_task = serializer.save()
        TaskActivity.objects.create(
            task=updated_task,
            actor=user,
            action=TaskActivityAction.UPDATED,
            details="Task details updated."
        )

    @action(detail=True, methods=['post', 'patch'], url_path='start')
    def start_task(self, request, pk=None):
        task = self.get_object()
        if request.user.role == UserRole.COLLEGE_MANAGEMENT:
            return Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
        comment = request.data.get('comment', '')
        task = TaskService.update_status(task, TaskStatus.IN_PROGRESS, actor=request.user, comment=comment)
        return Response(IQACTaskSerializer(task).data)

    @action(detail=True, methods=['post', 'patch'], url_path='complete')
    def complete_task(self, request, pk=None):
        task = self.get_object()
        if request.user.role == UserRole.COLLEGE_MANAGEMENT:
            return Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
        comment = request.data.get('comment', '')
        task = TaskService.update_status(task, TaskStatus.COMPLETED, actor=request.user, comment=comment)
        return Response(IQACTaskSerializer(task).data)

    @action(detail=True, methods=['post', 'patch'], url_path='block')
    def block_task(self, request, pk=None):
        task = self.get_object()
        if request.user.role == UserRole.COLLEGE_MANAGEMENT:
            return Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
        comment = request.data.get('comment', '')
        task = TaskService.update_status(task, TaskStatus.BLOCKED, actor=request.user, comment=comment)
        return Response(IQACTaskSerializer(task).data)

    @action(detail=True, methods=['post', 'patch'], url_path='reopen')
    def reopen_task(self, request, pk=None):
        task = self.get_object()
        if request.user.role == UserRole.COLLEGE_MANAGEMENT:
            return Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
        comment = request.data.get('comment', '')
        task = TaskService.update_status(task, TaskStatus.TODO, actor=request.user, comment=comment)
        return Response(IQACTaskSerializer(task).data)

    @action(detail=True, methods=['post', 'patch'], url_path='cancel')
    def cancel_task(self, request, pk=None):
        task = self.get_object()
        if request.user.role == UserRole.COLLEGE_MANAGEMENT:
            return Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
        comment = request.data.get('comment', '')
        task = TaskService.update_status(task, TaskStatus.CANCELLED, actor=request.user, comment=comment)
        return Response(IQACTaskSerializer(task).data)

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        task = self.get_object()
        if request.method == 'POST':
            if request.user.role == UserRole.COLLEGE_MANAGEMENT:
                return Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
            comment_text = request.data.get('comment', '').strip()
            if not comment_text:
                return Response({'error': 'Comment cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
            comment_obj = TaskService.add_comment(task, request.user, comment_text)
            return Response(TaskCommentSerializer(comment_obj).data, status=status.HTTP_201_CREATED)

        comments_qs = task.comments.select_related('author').order_by('created_at')
        return Response(TaskCommentSerializer(comments_qs, many=True).data)

    @action(detail=True, methods=['get'], url_path='activities')
    def activities(self, request, pk=None):
        task = self.get_object()
        acts = task.activities.select_related('actor').order_by('-created_at')
        return Response(TaskActivitySerializer(acts, many=True).data)

    @action(detail=False, methods=['get'], url_path='deadlines')
    def deadlines(self, request):
        user = request.user
        deadlines_data = DeadlineService.get_deadlines(user)
        return Response(deadlines_data)


class WorkQueueViewSet(viewsets.ViewSet):
    """
    Dedicated operational work queues for IQAC, HOD, In-charge, and Faculty,
    plus role-aware My Work dashboard component.
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='my-work')
    def my_work(self, request):
        data = WorkQueueService.get_my_work(request.user)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='iqac')
    def iqac_queue(self, request):
        user = request.user
        if user.role not in [UserRole.IQAC, UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT]:
            return Response({'error': 'Access restricted to IQAC coordinators and leadership.'}, status=status.HTTP_403_FORBIDDEN)
        data = WorkQueueService.get_iqac_work_queue(user)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='hod')
    def hod_queue(self, request):
        user = request.user
        if user.role not in [UserRole.HOD, UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT]:
            return Response({'error': 'Access restricted to Heads of Department.'}, status=status.HTTP_403_FORBIDDEN)
        data = WorkQueueService.get_hod_work_queue(user)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='incharge')
    def incharge_queue(self, request):
        user = request.user
        if user.role not in [UserRole.DEPARTMENT_INCHARGE, UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT]:
            return Response({'error': 'Access restricted to Department In-charges.'}, status=status.HTTP_403_FORBIDDEN)
        data = WorkQueueService.get_incharge_work_queue(user)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='faculty')
    def faculty_workspace(self, request):
        user = request.user
        if user.role not in [UserRole.FACULTY, UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT]:
            return Response({'error': 'Access restricted to Faculty.'}, status=status.HTTP_403_FORBIDDEN)
        data = WorkQueueService.get_faculty_workspace(user)
        return Response(data)


class AutomationRuleViewSet(viewsets.ModelViewSet):
    """
    Automation Rule configuration and evaluation engine API.
    Rules assist workflows via notifications/tasks; they NEVER mutate or approve evidence.
    """
    serializer_class = AutomationRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.college and user.role != UserRole.SUPER_ADMIN:
            return AutomationRule.objects.none()
        qs = AutomationRule.objects.all()
        if user.college:
            qs = qs.filter(college=user.college)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        if user.role in [UserRole.COLLEGE_MANAGEMENT, UserRole.FACULTY]:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only IQAC coordinators and Super Admins can configure automation rules.")
        serializer.save(college=user.college)

    def perform_update(self, serializer):
        user = self.request.user
        if user.role in [UserRole.COLLEGE_MANAGEMENT, UserRole.FACULTY]:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only IQAC coordinators and Super Admins can modify automation rules.")
        serializer.save()

    @action(detail=False, methods=['post'], url_path='evaluate')
    def trigger_evaluation(self, request):
        """
        Manually trigger background automation evaluation and scheduled reminders.
        """
        user = request.user
        if user.role not in [UserRole.IQAC, UserRole.SUPER_ADMIN]:
            return Response({'error': 'Only IQAC and Super Admins can evaluate rules.'}, status=status.HTTP_403_FORBIDDEN)

        college = user.college
        # 1. Reminders and overdue checks
        reminders_count = ReminderAndEscalationEngine.process_deadline_reminders(college)
        overdue_count = ReminderAndEscalationEngine.process_overdue_escalations(college)
        stalls_count = ReminderAndEscalationEngine.process_verification_stalls(college)

        # 2. Automation rules
        executed_rules = AutomationEngine.evaluate_rules(college)

        return Response({
            'status': 'success',
            'reminders_generated': reminders_count,
            'overdue_tasks_escalated': overdue_count,
            'verification_stalls_flagged': stalls_count,
            'automation_rules_evaluated': executed_rules,
        })
