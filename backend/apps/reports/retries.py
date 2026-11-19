"""Database-backed retries using existing report metadata; no cache or file deletion."""
import hashlib
import json
from functools import wraps
from django.db import transaction
from rest_framework.utils.encoders import JSONEncoder as DjangoJSONEncoder
from rest_framework.response import Response
from apps.accounts.models import User
from .models import GeneratedReport, ReportStatus


def report_retry(method):
    @wraps(method)
    @transaction.atomic
    def wrapped(self, request, *args, **kwargs):
        action = method.__name__
        handoffs = {'submit_to_hod': ('DEPARTMENT_INCHARGE', 'submitted_to_hod'),
                    'hod_download': ('HOD', 'hod_downloaded'),
                    'submit_to_admins': ('HOD', 'submitted_to_admins')}
        if action in handoffs:
            role, flag = handoffs[action]
            if request.user.role != role or not request.user.department_id:
                return Response({'error': 'Assigned department and authorized role required.'}, status=403)
            report = self.get_queryset().select_for_update(of=('self',)).filter(pk=kwargs.get('pk')).first()
            if not report:
                return Response({'error': 'Report outside your department or institution.'}, status=403)
            if report.status != ReportStatus.COMPLETED:
                return Response({'error': 'Only completed reports can be handed off.'}, status=400)
            metadata = report.filters_applied or {}
            cached = metadata.get('_handoff_responses', {}).get(action)
            if cached:
                return Response(cached)
            # Legacy handoffs retain their timestamps and do not resend notifications.
            if metadata.get(flag):
                return Response({'status': 'success', 'message': 'Already recorded.',
                                 'id': str(report.id), 'report_id': str(report.id),
                                 'download_url': f'/api/v1/reports/{report.id}/download/'})
            response = method(self, request, *args, **kwargs)
            if response.status_code < 300:
                report.refresh_from_db()
                metadata = report.filters_applied or {}
                metadata.setdefault('_handoff_responses', {})[action] = json.loads(json.dumps(response.data, cls=DjangoJSONEncoder))
                report.filters_applied = metadata
                report.save(update_fields=['filters_applied'])
            return response
        key = request.headers.get('Idempotency-Key')
        if not key:
            return method(self, request, *args, **kwargs)
        if len(key) > 128:
            return Response({'error': 'Idempotency-Key must contain at most 128 characters.'}, status=400)
        # Serialize requests for this actor, including first-use keys with no report yet.
        User.objects.select_for_update().get(pk=request.user.pk)
        scope = f'{request.user.pk}:{request.user.role}:{request.user.college_id}:{request.user.department_id}:{action}:{key}'
        key_hash = hashlib.sha256(scope.encode()).hexdigest()
        body_hash = hashlib.sha256(json.dumps(request.data, sort_keys=True, cls=DjangoJSONEncoder).encode()).hexdigest()
        report = GeneratedReport.objects.filter(generated_by=request.user, filters_applied___retry__key=key_hash).first()
        if report:
            if not self.get_queryset().filter(pk=report.pk).exists():
                return Response({'error': 'Original report is no longer available.'}, status=409)
            cached = report.filters_applied['_retry']
            if cached['body'] != body_hash:
                return Response({'error': 'Idempotency-Key already used for a different request.'}, status=409)
            return Response(cached['response'], status=cached['status'])
        response = method(self, request, *args, **kwargs)
        if response.status_code < 300 and response.data.get('id'):
            report = GeneratedReport.objects.get(pk=response.data['id'], generated_by=request.user)
            metadata = report.filters_applied or {}
            metadata['_retry'] = {'key': key_hash, 'body': body_hash, 'status': response.status_code,
                                  'response': json.loads(json.dumps(response.data, cls=DjangoJSONEncoder))}
            report.filters_applied = metadata
            report.save(update_fields=['filters_applied'])
        return response
    return wrapped
