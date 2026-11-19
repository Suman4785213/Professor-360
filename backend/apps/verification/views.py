from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db import transaction

from core.mixins import TenantMixin
from core.permissions import IsDepartmentIncharge, IsHOD, IsIQAC
from apps.audit.utils import log_action
from apps.activities.models import Activity, ActivityStatus
from apps.evidence.models import Evidence
from apps.notifications.utils import (
    notify_on_incharge_approval,
    notify_on_incharge_rejection,
    notify_on_hod_approval,
    notify_on_hod_rejection,
    notify_on_iqac_approval,
    notify_on_iqac_rejection,
)
from .models import VerificationRecord, VerificationLog, VerificationAction
from .serializers import VerificationRecordSerializer


class VerificationViewSet(TenantMixin, viewsets.ReadOnlyModelViewSet):
    queryset = VerificationRecord.objects.all().select_related(
        'activity', 'activity__faculty', 'activity__department', 'activity__academic_year',
        'incharge_verified_by', 'hod_approved_by', 'iqac_verified_by'
    ).prefetch_related('logs', 'activity__documents')
    serializer_class = VerificationRecordSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        'current_status': ['exact', 'in'],
        'activity__academic_year': ['exact'],
        'activity__category': ['exact'],
        'activity__activity_type': ['exact'],
        'activity__department': ['exact'],
        'activity__faculty': ['exact'],
    }
    search_fields = [
        'activity__title', 'activity__organizer',
        'activity__faculty__first_name', 'activity__faculty__last_name',
        'activity__department__name', 'activity__certificate_number'
    ]
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return VerificationRecord.objects.none()
        if user.role == 'FACULTY':
            return qs.filter(activity__faculty=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            return qs.filter(activity__department=user.department) if user.department_id else qs.none()
        return qs

    @action(detail=True, methods=['post'], permission_classes=[IsDepartmentIncharge], url_path='incharge-verify')
    @transaction.atomic
    def incharge_verify(self, request, pk=None):
        rec = self.get_object()
        activity = Activity.objects.select_for_update().get(pk=rec.activity_id)
        rec = VerificationRecord.objects.select_for_update().get(pk=rec.pk)
        decision = request.data.get('decision')  # 'APPROVE' or 'REJECT'
        comment = request.data.get('comment', '').strip()

        # Enforce state machine
        if activity.status not in (ActivityStatus.PENDING_INCHARGE, ActivityStatus.RETURNED_TO_INCHARGE):
            return Response(
                {'detail': f'Activity is not pending In-charge verification (current status: {activity.status}).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce department isolation
        if activity.department_id != request.user.department_id:
            return Response(
                {'detail': 'You can only verify submissions belonging to your assigned department.'},
                status=status.HTTP_403_FORBIDDEN
            )

        prev_status = activity.status
        if decision == 'APPROVE':
            new_status = ActivityStatus.PENDING_HOD
            action_type = VerificationAction.INCHARGE_APPROVED
            rec.incharge_verified_by = request.user
            rec.incharge_verified_at = timezone.now()
            rec.incharge_comment = comment or 'Verified by Department In-charge.'
            activity.status = new_status
            activity.save()
            rec.current_status = new_status
            rec.save()

            notify_on_incharge_approval(activity, sender=request.user)
            log_action(
                actor=request.user,
                action='INCHARGE_APPROVED',
                instance=activity,
                request=request,
                comment=f'In-charge verified activity "{activity.title}" and forwarded to HOD.'
            )
        elif decision == 'REJECT':
            if not comment:
                return Response({'detail': 'A rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
            new_status = ActivityStatus.RETURNED_TO_FACULTY
            action_type = VerificationAction.INCHARGE_REJECTED
            activity.last_rejection_reason = comment
            activity.last_rejected_by_role = request.user.role
            activity.last_rejected_at = timezone.now()
            activity.status = new_status
            activity.save()
            rec.current_status = new_status
            rec.save()

            notify_on_incharge_rejection(activity, sender=request.user, reason=comment)
            log_action(
                actor=request.user,
                action='INCHARGE_REJECTED',
                instance=activity,
                request=request,
                comment=f'In-charge returned activity "{activity.title}" to faculty: {comment}'
            )
        else:
            return Response({'detail': "decision must be either 'APPROVE' or 'REJECT'."}, status=status.HTTP_400_BAD_REQUEST)

        VerificationLog.objects.create(
            verification_record=rec,
            actor=request.user,
            role=request.user.role,
            action=action_type,
            previous_status=prev_status,
            new_status=new_status,
            comment=comment
        )

        return Response({
            'status': new_status,
            'message': f'In-charge decision recorded successfully: {new_status}.'
        })

    @action(detail=True, methods=['post'], permission_classes=[IsHOD], url_path='hod-verify')
    @transaction.atomic
    def hod_verify(self, request, pk=None):
        rec = self.get_object()
        activity = Activity.objects.select_for_update().get(pk=rec.activity_id)
        rec = VerificationRecord.objects.select_for_update().get(pk=rec.pk)
        decision = request.data.get('decision')
        comment = request.data.get('comment', '').strip()

        # Enforce state machine
        if activity.status != ActivityStatus.PENDING_HOD:
            return Response(
                {'detail': f'Activity is not pending HOD approval (current status: {activity.status}).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce department isolation
        if activity.department_id != request.user.department_id:
            return Response(
                {'detail': 'You can only approve submissions belonging to your assigned department.'},
                status=status.HTTP_403_FORBIDDEN
            )

        prev_status = activity.status
        if decision == 'APPROVE':
            new_status = ActivityStatus.PENDING_IQAC
            action_type = VerificationAction.HOD_APPROVED
            rec.hod_approved_by = request.user
            rec.hod_approved_at = timezone.now()
            rec.hod_comment = comment or 'Approved by Head of Department.'
            activity.status = new_status
            activity.save()
            rec.current_status = new_status
            rec.save()

            notify_on_hod_approval(activity, sender=request.user)
            log_action(
                actor=request.user,
                action='HOD_APPROVED',
                instance=activity,
                request=request,
                comment=f'HOD approved activity "{activity.title}" and forwarded to IQAC.'
            )
        elif decision == 'REJECT':
            if not comment:
                return Response({'detail': 'A rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
            new_status = ActivityStatus.RETURNED_TO_INCHARGE
            action_type = VerificationAction.HOD_REJECTED
            activity.last_rejection_reason = comment
            activity.last_rejected_by_role = request.user.role
            activity.last_rejected_at = timezone.now()
            activity.status = new_status
            activity.save()
            rec.current_status = new_status
            rec.save()

            notify_on_hod_rejection(activity, sender=request.user, reason=comment)
            log_action(
                actor=request.user,
                action='HOD_REJECTED',
                instance=activity,
                request=request,
                comment=f'HOD returned activity "{activity.title}" to In-charge: {comment}'
            )
        else:
            return Response({'detail': "decision must be either 'APPROVE' or 'REJECT'."}, status=status.HTTP_400_BAD_REQUEST)

        VerificationLog.objects.create(
            verification_record=rec,
            actor=request.user,
            role=request.user.role,
            action=action_type,
            previous_status=prev_status,
            new_status=new_status,
            comment=comment
        )

        return Response({
            'status': new_status,
            'message': f'HOD decision recorded successfully: {new_status}.'
        })

    @action(detail=True, methods=['post'], permission_classes=[IsIQAC], url_path='iqac-verify')
    @transaction.atomic
    def iqac_verify(self, request, pk=None):
        rec = self.get_object()
        activity = Activity.objects.select_for_update().get(pk=rec.activity_id)
        rec = VerificationRecord.objects.select_for_update().get(pk=rec.pk)
        decision = request.data.get('decision')
        comment = request.data.get('comment', '').strip()
        target_stage = request.data.get('target', 'DEPARTMENT_INCHARGE')

        # Enforce state machine
        if activity.status != ActivityStatus.PENDING_IQAC:
            return Response(
                {'detail': f'Activity is not pending IQAC verification (current status: {activity.status}).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce tenant isolation
        if activity.college_id != request.user.college_id:
            return Response(
                {'detail': 'Cross-college verification is prohibited.'},
                status=status.HTTP_403_FORBIDDEN
            )

        prev_status = activity.status
        if decision == 'APPROVE':
            new_status = ActivityStatus.VERIFIED_EVIDENCE
            action_type = VerificationAction.IQAC_APPROVED
            rec.iqac_verified_by = request.user
            rec.iqac_verified_at = timezone.now()
            rec.iqac_comment = comment or 'Verified and sealed by Central IQAC.'
            activity.status = new_status
            activity.save()
            rec.current_status = new_status
            rec.save()

            # Seal immutable Evidence record
            primary_doc = activity.documents.filter(is_primary=True).first() or activity.documents.first()
            Evidence.objects.update_or_create(
                activity=activity,
                defaults={
                    'college': activity.college,
                    'department': activity.department,
                    'faculty': activity.faculty,
                    'academic_year': activity.academic_year,
                    'document': primary_doc,
                    'title': activity.title,
                    'description': activity.description,
                    'category': activity.category.name if activity.category else (activity.activity_type or 'General'),
                    'is_verified': True,
                    'verified_at': timezone.now()
                }
            )

            notify_on_iqac_approval(activity, sender=request.user)
            try:
                from apps.integrations.services import WebhookService
                WebhookService.dispatch_event(
                    college=activity.college,
                    event_name="EVIDENCE_VERIFIED",
                    payload={
                        "activity_id": str(activity.id),
                        "title": activity.title,
                        "faculty": activity.faculty.email,
                        "academic_year": activity.academic_year.name if activity.academic_year else None,
                        "category": activity.category.name if activity.category else activity.activity_type,
                    }
                )
            except Exception as exc:
                pass
            log_action(
                actor=request.user,
                action='IQAC_APPROVED',
                instance=activity,
                request=request,
                comment=f'IQAC verified activity "{activity.title}" and sealed as verified evidence.'
            )
        elif decision == 'REJECT':
            if not comment:
                return Response({'detail': 'A rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Determine returned stage
            if target_stage == 'FACULTY':
                new_status = ActivityStatus.RETURNED_TO_FACULTY
            elif target_stage == 'HOD':
                new_status = ActivityStatus.RETURNED_TO_INCHARGE
            else:
                new_status = ActivityStatus.REJECTED_IQAC

            action_type = VerificationAction.IQAC_REJECTED
            activity.last_rejection_reason = comment
            activity.last_rejected_by_role = request.user.role
            activity.last_rejected_at = timezone.now()
            activity.status = new_status
            activity.save()
            rec.current_status = new_status
            rec.save()

            notify_on_iqac_rejection(activity, sender=request.user, reason=comment, target_role=target_stage)
            log_action(
                actor=request.user,
                action='IQAC_REJECTED',
                instance=activity,
                request=request,
                comment=f'IQAC returned activity "{activity.title}": {comment}'
            )
        else:
            return Response({'detail': "decision must be either 'APPROVE' or 'REJECT'."}, status=status.HTTP_400_BAD_REQUEST)

        VerificationLog.objects.create(
            verification_record=rec,
            actor=request.user,
            role=request.user.role,
            action=action_type,
            previous_status=prev_status,
            new_status=new_status,
            comment=comment
        )

        return Response({
            'status': new_status,
            'message': f'IQAC decision recorded successfully: {new_status}.'
        })
