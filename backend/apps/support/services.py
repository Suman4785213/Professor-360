"""
Services for Support & Operations — Phase 18
Implements SupportTicketService, JobMonitoringService, SecurityEventService,
AdminSearchService, and MaintenanceModeService.
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q
from django.conf import settings

from apps.accounts.models import User, RoleChoices
from apps.colleges.models import College
from apps.audit.models import AuditLog
from apps.notifications.services import NotificationDispatcher
from apps.notifications.models import NotificationCategory, NotificationPriority

from .models import (
    SupportTicket,
    TicketComment,
    TicketAttachment,
    SupportTicketCategory,
    SupportTicketPriority,
    SupportTicketStatus,
    SLAStatus,
    Incident,
    IncidentStatus,
    IncidentSeverity,
    SecurityEvent,
    SecurityEventType,
    SecurityEventSeverity,
    SystemMaintenanceSetting,
)

logger = logging.getLogger(__name__)


class SupportTicketService:
    """Manages support ticket lifecycles, SLA calculations, and notification dispatches."""

    SLA_CONFIG = {
        SupportTicketPriority.CRITICAL: {'response_hours': 2, 'resolution_hours': 12},
        SupportTicketPriority.HIGH: {'response_hours': 6, 'resolution_hours': 24},
        SupportTicketPriority.MEDIUM: {'response_hours': 24, 'resolution_hours': 72},
        SupportTicketPriority.LOW: {'response_hours': 48, 'resolution_hours': 120},
    }

    @classmethod
    def create_ticket(
        cls,
        college: College,
        created_by: User,
        category: str,
        priority: str,
        subject: str,
        description: str
    ) -> SupportTicket:
        now = timezone.now()
        config = cls.SLA_CONFIG.get(priority, cls.SLA_CONFIG[SupportTicketPriority.MEDIUM])

        first_response_due_at = now + timedelta(hours=config['response_hours'])
        resolution_due_at = now + timedelta(hours=config['resolution_hours'])

        ticket = SupportTicket.objects.create(
            college=college,
            created_by=created_by,
            category=category,
            priority=priority,
            subject=subject,
            description=description,
            status=SupportTicketStatus.OPEN,
            sla_status=SLAStatus.ON_TIME,
            first_response_due_at=first_response_due_at,
            resolution_due_at=resolution_due_at,
        )

        # Notify platform Super Admins
        super_admins = User.objects.filter(role=RoleChoices.SUPER_ADMIN, is_active=True)[:5]
        for sa in super_admins:
            try:
                NotificationDispatcher.dispatch(
                    recipient=sa,
                    sender=created_by,
                    category=NotificationCategory.SYSTEM,
                    notification_type='SUPPORT_TICKET_CREATED',
                    title=f"New Ticket: {ticket.ticket_number} ({priority})",
                    body=f"[{college.name}] {subject}",
                    priority=NotificationPriority.HIGH if priority in [SupportTicketPriority.HIGH, SupportTicketPriority.CRITICAL] else NotificationPriority.NORMAL,
                    action_url=f"/admin/support?ticket={ticket.ticket_number}",
                    action_label="View Ticket",
                    related_model='SupportTicket',
                    related_id=ticket.id,
                    college=college,
                )
            except Exception as e:
                logger.error(f"Failed to dispatch ticket creation notification: {e}")

        # Audit log
        AuditLog.objects.create(
            college=college,
            actor=created_by,
            actor_role=created_by.role,
            actor_email=created_by.email,
            action='SUPPORT_TICKET_CREATED',
            model_name='SupportTicket',
            object_id=str(ticket.id),
            object_repr=f"[{ticket.ticket_number}] {ticket.subject}",
            comment=f"Support ticket created under category {category} with priority {priority}",
        )

        return ticket

    @classmethod
    def add_comment(
        cls,
        ticket: SupportTicket,
        author: User,
        message: str,
        is_internal: bool = False
    ) -> TicketComment:
        # Check tenant authorization
        is_super_admin = (author.role == RoleChoices.SUPER_ADMIN)
        if not is_super_admin and author.college_id != ticket.college_id:
            raise PermissionError("Cross-tenant comment not permitted.")

        # Non-superadmins cannot create internal notes
        if is_internal and not is_super_admin:
            is_internal = False

        comment = TicketComment.objects.create(
            ticket=ticket,
            author=author,
            is_internal=is_internal,
            message=message
        )

        now = timezone.now()
        ticket_updated = False

        if is_super_admin and not is_internal:
            # If this is the first response from an admin
            if not ticket.first_responded_at:
                ticket.first_responded_at = now
                ticket_updated = True

            if ticket.status == SupportTicketStatus.OPEN:
                ticket.status = SupportTicketStatus.IN_PROGRESS
                ticket_updated = True

            # Notify creator
            try:
                NotificationDispatcher.dispatch(
                    recipient=ticket.created_by,
                    sender=author,
                    category=NotificationCategory.SYSTEM,
                    notification_type='SUPPORT_ADMIN_REPLIED',
                    title=f"Update on {ticket.ticket_number}",
                    body=f"Support team replied to your ticket: '{ticket.subject[:50]}...'",
                    priority=NotificationPriority.NORMAL,
                    action_url=f"/support?ticket={ticket.ticket_number}",
                    action_label="View Reply",
                    related_model='SupportTicket',
                    related_id=ticket.id,
                    college=ticket.college,
                )
            except Exception as e:
                logger.error(f"Failed to notify ticket creator on reply: {e}")

        elif not is_super_admin:
            # User replied: if ticket was WAITING_FOR_USER, flip back to IN_PROGRESS
            if ticket.status == SupportTicketStatus.WAITING_FOR_USER:
                ticket.status = SupportTicketStatus.IN_PROGRESS
                ticket_updated = True

            # Notify assigned admin or super admins
            recipient = ticket.assigned_to or User.objects.filter(role=RoleChoices.SUPER_ADMIN, is_active=True).first()
            if recipient:
                try:
                    NotificationDispatcher.dispatch(
                        recipient=recipient,
                        sender=author,
                        category=NotificationCategory.SYSTEM,
                        notification_type='SUPPORT_USER_REPLIED',
                        title=f"User Replied on {ticket.ticket_number}",
                        body=f"[{ticket.college.name}] User commented: '{message[:60]}...'",
                        priority=NotificationPriority.NORMAL,
                        action_url=f"/admin/support?ticket={ticket.ticket_number}",
                        action_label="View Ticket",
                        related_model='SupportTicket',
                        related_id=ticket.id,
                        college=ticket.college,
                    )
                except Exception as e:
                    logger.error(f"Failed to notify admin on user comment: {e}")

        # Recalculate SLA
        new_sla = ticket.calculate_sla_status()
        if new_sla != ticket.sla_status:
            ticket.sla_status = new_sla
            ticket_updated = True

        if ticket_updated:
            ticket.save()

        return comment

    @classmethod
    def assign_ticket(cls, ticket: SupportTicket, admin_user: User, assignee: User) -> SupportTicket:
        ticket.assigned_to = assignee
        if ticket.status == SupportTicketStatus.OPEN:
            ticket.status = SupportTicketStatus.IN_PROGRESS
        ticket.save()

        # Notify assignee
        try:
            NotificationDispatcher.dispatch(
                recipient=assignee,
                sender=admin_user,
                category=NotificationCategory.SYSTEM,
                notification_type='SUPPORT_TICKET_ASSIGNED',
                title=f"Ticket Assigned: {ticket.ticket_number}",
                body=f"You have been assigned ticket '{ticket.subject}' from {ticket.college.name}",
                priority=NotificationPriority.NORMAL,
                action_url=f"/admin/support?ticket={ticket.ticket_number}",
                action_label="Open Ticket",
                related_model='SupportTicket',
                related_id=ticket.id,
                college=ticket.college,
            )
        except Exception as e:
            logger.error(f"Failed to dispatch assignment notification: {e}")

        AuditLog.objects.create(
            college=ticket.college,
            actor=admin_user,
            actor_role=admin_user.role,
            actor_email=admin_user.email,
            action='SUPPORT_TICKET_ASSIGNED',
            model_name='SupportTicket',
            object_id=str(ticket.id),
            object_repr=f"[{ticket.ticket_number}] Assigned to {assignee.email}",
            comment=f"Ticket assigned to {assignee.email}",
        )
        return ticket

    @classmethod
    def resolve_ticket(cls, ticket: SupportTicket, admin_user: User, resolution_notes: str = '') -> SupportTicket:
        now = timezone.now()
        ticket.status = SupportTicketStatus.RESOLVED
        ticket.resolved_at = now
        ticket.resolution_notes = resolution_notes
        ticket.sla_status = ticket.calculate_sla_status()
        ticket.save()

        # Notify user
        try:
            NotificationDispatcher.dispatch(
                recipient=ticket.created_by,
                sender=admin_user,
                category=NotificationCategory.SYSTEM,
                notification_type='SUPPORT_TICKET_RESOLVED',
                title=f"Resolved: {ticket.ticket_number}",
                body=f"Your support ticket '{ticket.subject}' has been marked as resolved.",
                priority=NotificationPriority.NORMAL,
                action_url=f"/support?ticket={ticket.ticket_number}",
                action_label="View Ticket",
                related_model='SupportTicket',
                related_id=ticket.id,
                college=ticket.college,
            )
        except Exception as e:
            logger.error(f"Failed to notify ticket creator on resolve: {e}")

        AuditLog.objects.create(
            college=ticket.college,
            actor=admin_user,
            actor_role=admin_user.role,
            actor_email=admin_user.email,
            action='SUPPORT_TICKET_RESOLVED',
            model_name='SupportTicket',
            object_id=str(ticket.id),
            object_repr=f"[{ticket.ticket_number}] Resolved",
            comment=f"Ticket marked resolved with notes: {resolution_notes[:100]}",
        )
        return ticket

    @classmethod
    def set_waiting_for_user(cls, ticket: SupportTicket, admin_user: User) -> SupportTicket:
        ticket.status = SupportTicketStatus.WAITING_FOR_USER
        ticket.save()

        try:
            NotificationDispatcher.dispatch(
                recipient=ticket.created_by,
                sender=admin_user,
                category=NotificationCategory.SYSTEM,
                notification_type='SUPPORT_TICKET_WAITING_FOR_USER',
                title=f"Action Required: {ticket.ticket_number}",
                body=f"Our team needs additional info for ticket '{ticket.subject}'.",
                priority=NotificationPriority.NORMAL,
                action_url=f"/support?ticket={ticket.ticket_number}",
                action_label="Provide Details",
                related_model='SupportTicket',
                related_id=ticket.id,
                college=ticket.college,
            )
        except Exception as e:
            logger.error(f"Failed to notify waiting status: {e}")

        return ticket


class JobMonitoringService:
    """Aggregates background jobs across platform subsystems with safe retry support."""

    @classmethod
    def get_jobs(cls, job_type: Optional[str] = None, status: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        jobs = []

        # 1. AI Jobs
        if not job_type or job_type == 'AI':
            try:
                from apps.ai.models import AIProcessingJob
                ai_qs = AIProcessingJob.objects.select_related('college').order_by('-created_at')[:limit]
                for job in ai_qs:
                    normalized_status = 'COMPLETED' if job.status == 'SUCCESS' else ('FAILED' if job.status == 'FAILED' else ('RUNNING' if job.status == 'PROCESSING' else 'QUEUED'))
                    if status and normalized_status != status:
                        continue
                    jobs.append({
                        'id': str(job.id),
                        'job_type': 'AI',
                        'title': f"AI Extraction: {job.original_filename or 'Document'}",
                        'tenant_name': job.college.name if job.college else 'Platform',
                        'college_id': str(job.college_id) if job.college_id else None,
                        'status': normalized_status,
                        'created_at': job.created_at.isoformat(),
                        'error_message': getattr(job, 'error_message', ''),
                        'is_retryable': normalized_status == 'FAILED',
                    })
            except Exception as e:
                logger.error(f"Error reading AI jobs: {e}")

        # 2. Reports
        if not job_type or job_type == 'REPORTS':
            try:
                from apps.reports.models import GeneratedReport
                rep_qs = GeneratedReport.objects.select_related('college').order_by('-created_at')[:limit]
                for r in rep_qs:
                    normalized_status = 'COMPLETED' if r.status == 'COMPLETED' else ('FAILED' if r.status == 'FAILED' else 'RUNNING')
                    if status and normalized_status != status:
                        continue
                    jobs.append({
                        'id': str(r.id),
                        'job_type': 'REPORTS',
                        'title': f"Report: {r.title}",
                        'tenant_name': r.college.name if r.college else 'Platform',
                        'college_id': str(r.college_id) if r.college_id else None,
                        'status': normalized_status,
                        'created_at': r.created_at.isoformat(),
                        'error_message': getattr(r, 'error_message', ''),
                        'is_retryable': normalized_status == 'FAILED',
                    })
            except Exception as e:
                logger.error(f"Error reading Report jobs: {e}")

        # 3. Imports
        if not job_type or job_type == 'IMPORTS':
            try:
                from apps.imports.models import ImportJob
                imp_qs = ImportJob.objects.select_related('college').order_by('-created_at')[:limit]
                for imp in imp_qs:
                    normalized_status = 'COMPLETED' if imp.status == 'COMPLETED' else ('FAILED' if imp.status == 'FAILED' else ('RUNNING' if imp.status == 'PROCESSING' else 'QUEUED'))
                    if status and normalized_status != status:
                        continue
                    jobs.append({
                        'id': str(imp.id),
                        'job_type': 'IMPORTS',
                        'title': f"Import: {imp.file_name or imp.data_type}",
                        'tenant_name': imp.college.name if imp.college else 'Platform',
                        'college_id': str(imp.college_id) if imp.college_id else None,
                        'status': normalized_status,
                        'created_at': imp.created_at.isoformat(),
                        'error_message': getattr(imp, 'error_summary', ''),
                        'is_retryable': normalized_status == 'FAILED',
                    })
            except Exception as e:
                logger.error(f"Error reading Import jobs: {e}")

        # 4. Outbound Emails
        if not job_type or job_type == 'NOTIFICATIONS':
            try:
                from apps.integrations.models import EmailDeliveryLog
                email_qs = EmailDeliveryLog.objects.select_related('college').order_by('-created_at')[:limit]
                for eml in email_qs:
                    normalized_status = 'COMPLETED' if eml.status == 'SENT' else ('FAILED' if eml.status == 'FAILED' else 'QUEUED')
                    if status and normalized_status != status:
                        continue
                    jobs.append({
                        'id': str(eml.id),
                        'job_type': 'NOTIFICATIONS',
                        'title': f"Email: {eml.subject} to {eml.recipient_email}",
                        'tenant_name': eml.college.name if eml.college else 'Platform',
                        'college_id': str(eml.college_id) if eml.college_id else None,
                        'status': normalized_status,
                        'created_at': eml.created_at.isoformat(),
                        'error_message': eml.error_message,
                        'is_retryable': normalized_status == 'FAILED',
                    })
            except Exception as e:
                logger.error(f"Error reading Email delivery logs: {e}")

        # 5. Webhooks
        if not job_type or job_type == 'WEBHOOKS':
            try:
                from apps.imports.models import WebhookDeliveryLog
                wh_qs = WebhookDeliveryLog.objects.order_by('-created_at')[:limit]
                for wh in wh_qs:
                    normalized_status = 'COMPLETED' if wh.status == 'SUCCESS' else ('FAILED' if wh.status == 'FAILED' else 'RUNNING')
                    if status and normalized_status != status:
                        continue
                    jobs.append({
                        'id': str(wh.id),
                        'job_type': 'WEBHOOKS',
                        'title': f"Webhook: {wh.event_name}",
                        'tenant_name': 'External Delivery',
                        'college_id': None,
                        'status': normalized_status,
                        'created_at': wh.created_at.isoformat(),
                        'error_message': wh.error_message,
                        'is_retryable': normalized_status == 'FAILED',
                    })
            except Exception as e:
                logger.error(f"Error reading Webhook logs: {e}")

        # Sort combined list by created_at descending
        jobs.sort(key=lambda j: j['created_at'], reverse=True)
        return jobs[:limit]

    @classmethod
    def retry_job(cls, job_type: str, job_id: str, user: User) -> Dict[str, Any]:
        """Safely retries an idempotent failed background task."""
        if user.role != RoleChoices.SUPER_ADMIN:
            raise PermissionError("Only Super Admins can retry background jobs.")

        if job_type == 'AI':
            from apps.ai.models import AIProcessingJob
            job = AIProcessingJob.objects.filter(id=job_id).first()
            if not job:
                raise ValueError("AI Job not found.")
            job.status = 'PENDING'
            job.error_message = ''
            job.save()
            AuditLog.objects.create(
                college=job.college,
                actor=user,
                actor_role=user.role,
                actor_email=user.email,
                action='JOB_RETRIED',
                model_name='AIProcessingJob',
                object_id=str(job.id),
                comment="AI job reset to PENDING for retry",
            )
            return {'success': True, 'message': 'AI job re-queued for processing.'}

        elif job_type == 'REPORTS':
            from apps.reports.models import GeneratedReport
            rep = GeneratedReport.objects.filter(id=job_id).first()
            if not rep:
                raise ValueError("Report job not found.")
            rep.status = 'PENDING'
            rep.save()
            AuditLog.objects.create(
                college=rep.college,
                actor=user,
                actor_role=user.role,
                actor_email=user.email,
                action='JOB_RETRIED',
                model_name='GeneratedReport',
                object_id=str(rep.id),
                comment="Report job reset to PENDING for regeneration",
            )
            return {'success': True, 'message': 'Report generation re-queued.'}

        elif job_type == 'NOTIFICATIONS':
            from apps.integrations.models import EmailDeliveryLog
            from apps.integrations.services.email_service import EmailService
            eml = EmailDeliveryLog.objects.filter(id=job_id).first()
            if not eml:
                raise ValueError("Email delivery record not found.")
            success = EmailService.retry_failed_delivery(str(eml.id))
            AuditLog.objects.create(
                college=eml.college,
                actor=user,
                actor_role=user.role,
                actor_email=user.email,
                action='JOB_RETRIED',
                model_name='EmailDeliveryLog',
                object_id=str(eml.id),
                comment="Outbound email re-attempted",
            )
            return {'success': success, 'message': 'Email delivery re-attempted.'}

        raise ValueError(f"Job type '{job_type}' is not supported for safe retry.")


class SecurityEventService:
    """Records security incidents and audit entries with IP and path attribution."""

    @classmethod
    def log_event(
        cls,
        event_type: str,
        severity: str = SecurityEventSeverity.MEDIUM,
        college: Optional[College] = None,
        user: Optional[User] = None,
        user_email: str = '',
        ip_address: Optional[str] = None,
        path: str = '',
        details: Optional[Dict[str, Any]] = None,
    ) -> SecurityEvent:
        if user and not user_email:
            user_email = user.email

        event = SecurityEvent.objects.create(
            event_type=event_type,
            severity=severity,
            college=college,
            user=user,
            user_email=user_email,
            ip_address=ip_address,
            path=path,
            details=details or {},
        )

        # Mirror high/critical severity security violations into AuditLog
        if severity in [SecurityEventSeverity.HIGH, SecurityEventSeverity.CRITICAL]:
            AuditLog.objects.create(
                college=college,
                actor=user,
                actor_role=getattr(user, 'role', 'ANONYMOUS'),
                actor_email=user_email or 'Anonymous',
                action=f"SECURITY_ALERT_{event_type}",
                model_name='SecurityEvent',
                object_id=str(event.id),
                ip_address=ip_address,
                comment=f"Security violation recorded at {path}. Details: {details or {}}",
            )

        return event


class AdminSearchService:
    """Performs unified administrative searches across platform resources."""

    @classmethod
    def search(cls, query: str, user: User) -> Dict[str, Any]:
        if user.role != RoleChoices.SUPER_ADMIN:
            raise PermissionError("Admin search is restricted to Super Admins.")

        query = query.strip()
        if len(query) < 2:
            return {
                'colleges': [],
                'users': [],
                'tickets': [],
                'incidents': [],
                'audit_logs': [],
                'subscriptions': [],
            }

        # 1. Colleges
        colleges = [
            {'id': str(c.id), 'name': c.name, 'code': c.code, 'status': c.status, 'contact_email': c.email}
            for c in College.objects.filter(
                Q(name__icontains=query) | Q(code__icontains=query) | Q(email__icontains=query),
                is_deleted=False
            )[:10]
        ]

        # 2. Users (Strictly no password/secret exposure)
        users = [
            {
                'id': str(u.id),
                'email': u.email,
                'name': f"{u.first_name} {u.last_name}".strip(),
                'role': u.role,
                'college_name': u.college.name if u.college else 'Super Admin',
                'is_active': u.is_active,
                'employee_id': u.employee_id,
            }
            for u in User.objects.filter(
                Q(email__icontains=query) | Q(first_name__icontains=query) | Q(last_name__icontains=query) | Q(employee_id__icontains=query)
            )[:15]
        ]

        # 3. Support Tickets
        tickets = [
            {
                'id': str(t.id),
                'ticket_number': t.ticket_number,
                'subject': t.subject,
                'category': t.category,
                'priority': t.priority,
                'status': t.status,
                'college_name': t.college.name,
                'created_by_email': t.created_by.email,
            }
            for t in SupportTicket.objects.filter(
                Q(ticket_number__icontains=query) | Q(subject__icontains=query) | Q(description__icontains=query)
            )[:10]
        ]

        # 4. Incidents
        incidents = [
            {'id': str(inc.id), 'title': inc.title, 'severity': inc.severity, 'status': inc.status, 'started_at': inc.started_at.isoformat()}
            for inc in Incident.objects.filter(
                Q(title__icontains=query) | Q(description__icontains=query)
            )[:10]
        ]

        # 5. Audit Logs
        audit_logs = [
            {
                'id': str(a.id),
                'action': a.action,
                'actor_email': a.actor_email,
                'model_name': a.model_name,
                'created_at': a.created_at.isoformat(),
                'comment': a.comment,
            }
            for a in AuditLog.objects.filter(
                Q(action__icontains=query) | Q(actor_email__icontains=query) | Q(comment__icontains=query)
            )[:15]
        ]

        # 6. Subscriptions
        from apps.colleges.models import Subscription
        subscriptions = [
            {
                'id': str(s.id),
                'college_name': s.college.name,
                'plan_name': s.plan.name if s.plan else 'Custom',
                'status': s.status,
                'current_period_end': s.current_period_end.isoformat() if s.current_period_end else None,
            }
            for s in Subscription.objects.filter(
                Q(college__name__icontains=query) | Q(plan__name__icontains=query) | Q(status__icontains=query)
            )[:10]
        ]

        return {
            'colleges': colleges,
            'users': users,
            'tickets': tickets,
            'incidents': incidents,
            'audit_logs': audit_logs,
            'subscriptions': subscriptions,
        }


class MaintenanceModeService:
    """Manages global platform maintenance mode state and logging."""

    @classmethod
    def is_enabled(cls) -> bool:
        if getattr(settings, 'MAINTENANCE_MODE', False):
            return True
        try:
            setting = SystemMaintenanceSetting.get_setting()
            return setting.is_enabled
        except Exception:
            return False

    @classmethod
    def set_maintenance_mode(
        cls,
        enabled: bool,
        user: User,
        reason: str = 'Scheduled system maintenance.',
        estimated_duration_minutes: int = 60
    ) -> SystemMaintenanceSetting:
        if user.role != RoleChoices.SUPER_ADMIN:
            raise PermissionError("Only Super Admins can alter platform maintenance mode.")

        setting = SystemMaintenanceSetting.get_setting()
        previous_status = setting.is_enabled
        setting.is_enabled = enabled
        setting.reason = reason
        setting.estimated_duration_minutes = estimated_duration_minutes
        setting.updated_by = user
        setting.save()

        # Audit this high-risk action
        AuditLog.objects.create(
            college=None,
            actor=user,
            actor_role=user.role,
            actor_email=user.email,
            action='MAINTENANCE_MODE_TOGGLED',
            model_name='SystemMaintenanceSetting',
            object_id='1',
            comment=f"Maintenance mode set to {enabled}. Reason: {reason}",
            previous_data={'is_enabled': previous_status},
            new_data={'is_enabled': enabled, 'reason': reason, 'estimated_duration_minutes': estimated_duration_minutes},
        )

        return setting
