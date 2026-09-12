"""
Calendar Integration Service & Providers — Phase 16
Handles standard RFC 5545 iCalendar generation and external calendar syncing.
Explicit user action only — never automatically pollutes user calendars.
"""
import uuid
import logging
from typing import Optional, List
from datetime import datetime
from django.utils import timezone

from apps.integrations.models import CalendarSyncRecord
from .base import BaseCalendarProvider, IntegrationResult

logger = logging.getLogger(__name__)


class MockCalendarProvider(BaseCalendarProvider):
    """
    Mock Calendar Provider for tests and offline development.
    """
    synced_events = []

    @classmethod
    def reset(cls):
        cls.synced_events = []

    def create_or_update_event(
        self,
        user_email: str,
        summary: str,
        description: str,
        start_time,
        end_time,
        uid: str,
    ) -> IntegrationResult:
        event = {
            "user_email": user_email,
            "summary": summary,
            "description": description,
            "start_time": start_time,
            "end_time": end_time,
            "uid": uid,
        }
        self.synced_events.append(event)
        return IntegrationResult(
            success=True,
            status_code=200,
            message="Event synced to mock calendar",
            data={"uid": uid}
        )

    def delete_event(self, user_email: str, uid: str) -> IntegrationResult:
        self.synced_events = [e for e in self.synced_events if e.get("uid") != uid]
        return IntegrationResult(success=True, message="Event removed from mock calendar")


class ICalendarProvider(BaseCalendarProvider):
    """
    RFC 5545 standard iCalendar (.ics) format generator.
    Compatible with Google Calendar, Microsoft Outlook, Apple Calendar, and Thunderbird.
    """
    @classmethod
    def format_dt(cls, dt) -> str:
        if isinstance(dt, datetime):
            return dt.strftime("%Y%m%dT%H%M%SZ")
        return dt.strftime("%Y%m%d")

    @classmethod
    def generate_ics_content(
        cls,
        summary: str,
        description: str,
        start_time,
        end_time,
        uid: str,
    ) -> str:
        dtstamp = cls.format_dt(timezone.now())
        dtstart = cls.format_dt(start_time)
        dtend = cls.format_dt(end_time)

        clean_desc = description.replace("\n", "\\n").replace(",", "\\,")
        clean_sum = summary.replace("\n", " ").replace(",", "\\,")

        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//College IQAC SaaS Platform//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{dtstamp}",
            f"DTSTART:{dtstart}",
            f"DTEND:{dtend}",
            f"SUMMARY:{clean_sum}",
            f"DESCRIPTION:{clean_desc}",
            "STATUS:CONFIRMED",
            "END:VEVENT",
            "END:VCALENDAR",
        ]
        return "\r\n".join(lines) + "\r\n"

    def create_or_update_event(
        self,
        user_email: str,
        summary: str,
        description: str,
        start_time,
        end_time,
        uid: str,
    ) -> IntegrationResult:
        ics_text = self.generate_ics_content(summary, description, start_time, end_time, uid)
        return IntegrationResult(
            success=True,
            status_code=200,
            message="iCalendar payload generated",
            data={"ics": ics_text, "uid": uid}
        )

    def delete_event(self, user_email: str, uid: str) -> IntegrationResult:
        return IntegrationResult(success=True, message="Event deleted locally")


class CalendarService:
    """
    Coordinates calendar event generation and explicit user sync requests.
    """
    _provider_override: Optional[BaseCalendarProvider] = None

    @classmethod
    def set_provider_override(cls, provider: Optional[BaseCalendarProvider]):
        cls._provider_override = provider

    @classmethod
    def get_provider(cls) -> BaseCalendarProvider:
        if cls._provider_override:
            return cls._provider_override
        return MockCalendarProvider()

    @classmethod
    def sync_event_for_user(
        cls,
        college,
        user,
        event_type: str,
        entity_id,
        summary: str,
        description: str,
        start_time,
        end_time,
    ) -> IntegrationResult:
        """
        Creates or updates a user's calendar event upon explicit user confirmation.
        """
        event_uid = f"iqac-event-{entity_id or uuid.uuid4()}@iqac.saas"

        # Record in database
        sync_rec, _ = CalendarSyncRecord.objects.update_or_create(
            uid=event_uid,
            defaults={
                "college": college,
                "user": user,
                "event_type": event_type,
                "entity_id": entity_id,
                "summary": summary,
                "description": description,
                "start_time": start_time,
                "end_time": end_time,
                "sync_status": "SYNCED",
            }
        )

        provider = cls.get_provider()
        res = provider.create_or_update_event(
            user_email=user.email,
            summary=summary,
            description=description,
            start_time=start_time,
            end_time=end_time,
            uid=event_uid,
        )
        return res

    @classmethod
    def generate_task_ics(cls, task) -> str:
        """
        Generates standard .ics content for an IQAC task deadline.
        """
        uid = f"iqac-task-{task.id}@iqac.saas"
        due_datetime = datetime.combine(task.due_date, datetime.min.time()) if task.due_date else timezone.now()
        end_datetime = due_datetime + timezone.timedelta(hours=1)
        return ICalendarProvider.generate_ics_content(
            summary=f"Task Deadline: {task.title}",
            description=f"IQAC Task: {task.description or 'No description'}\\nPriority: {task.priority}\\nStatus: {task.status}",
            start_time=due_datetime,
            end_time=end_datetime,
            uid=uid,
        )
