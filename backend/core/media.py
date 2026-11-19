"""Fail-closed, storage-independent media gateway. Never serves arbitrary disk paths."""
import mimetypes
from django.db.models import Q
from django.http import FileResponse, Http404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import NotAuthenticated
from drf_spectacular.utils import extend_schema


def scoped(qs, user, owner='faculty_id'):
    if user.role == 'SUPER_ADMIN':
        return qs
    if not user.college_id:
        return qs.none()
    qs = qs.filter(college_id=user.college_id)
    if user.role in ('HOD', 'DEPARTMENT_INCHARGE'):
        return qs.filter(department_id=user.department_id) if user.department_id else qs.none()
    if user.role == 'FACULTY':
        return qs.filter(**{owner: user.id})
    return qs if user.role in ('IQAC', 'COLLEGE_MANAGEMENT') else qs.none()


@extend_schema(exclude=True)
@api_view(['GET'])
@permission_classes([AllowAny])
def media_file(request, path):
    from apps.colleges.models import College
    from apps.activities.models import Document
    from apps.accounts.models import FacultyProfile, User
    from apps.reports.models import GeneratedReport, ReportTemplate
    from apps.support.models import TicketAttachment
    if any(part in ('..', '.') for part in path.split('/')) or '\\' in path:
        raise Http404
    # Public only when explicitly referenced as institutional branding.
    logo = College.objects.filter(logo=path, is_active=True, is_deleted=False).first()
    field = logo.logo if logo else None
    if not field:
        if not request.user.is_authenticated:
            raise NotAuthenticated()
        user = request.user
        doc = scoped(Document.objects.filter(file=path), user, 'activity__faculty_id').first()
        report = scoped(GeneratedReport.objects.filter(file=path), user).first()
        profile = scoped(FacultyProfile.objects.filter(Q(resume=path) | Q(profile_photo=path)), user, 'user_id').first()
        avatar = scoped(User.objects.filter(avatar=path), user, 'id').first()
        if doc:
            field = doc.file
        elif report:
            field = report.file
        elif profile:
            field = profile.resume if profile.resume.name == path else profile.profile_photo
        elif avatar:
            field = avatar.avatar
        elif user.role in ('SUPER_ADMIN', 'IQAC', 'COLLEGE_MANAGEMENT'):
            templates = ReportTemplate.objects.filter(file=path, is_active=True)
            if user.role != 'SUPER_ADMIN':
                templates = templates.filter(Q(college_id=user.college_id) | Q(college__isnull=True)) if user.college_id else templates.none()
            template = templates.first()
            if template:
                field = template.file
        if not field:
            attachments = TicketAttachment.objects.filter(file=path).select_related('ticket__created_by')
            if user.role != 'SUPER_ADMIN':
                attachments = attachments.filter(ticket__college_id=user.college_id) if user.college_id else attachments.none()
                if user.role == 'FACULTY':
                    attachments = attachments.filter(ticket__created_by=user)
                elif user.role in ('HOD', 'DEPARTMENT_INCHARGE'):
                    attachments = attachments.filter(ticket__created_by__department_id=user.department_id) if user.department_id else attachments.none()
            attachment = attachments.first()
            if attachment:
                field = attachment.file
        # Unknown paths, AI intermediates and backups stay private.
    if not field:
        raise Http404
    try:
        mime = mimetypes.guess_type(field.name)[0] or 'application/octet-stream'
        response = FileResponse(field.open('rb'), content_type=mime,
            as_attachment=not bool(logo) and not mime.startswith('image/'), filename=field.name.split('/')[-1])
    except (OSError, ValueError):
        raise Http404
    response['Cache-Control'] = 'private, no-store'
    response['X-Content-Type-Options'] = 'nosniff'
    response['Referrer-Policy'] = 'no-referrer'
    return response
