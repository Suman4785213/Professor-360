from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, DateFilter, CharFilter
from rest_framework.filters import SearchFilter, OrderingFilter
from core.mixins import TenantMixin
from core.permissions import IsSuperAdminOrIQAC, IsSuperAdmin
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogFilter(FilterSet):
    date_from = DateFilter(field_name='created_at', lookup_expr='gte')
    date_to = DateFilter(field_name='created_at', lookup_expr='lte')
    entity = CharFilter(field_name='model_name', lookup_expr='iexact')
    role = CharFilter(field_name='actor_role', lookup_expr='iexact')

    class Meta:
        model = AuditLog
        fields = ['actor_role', 'action', 'model_name', 'college', 'actor', 'actor_email']


class AuditLogViewSet(TenantMixin, viewsets.ReadOnlyModelViewSet):
    """
    Immutable Audit Log Explorer — Read-only.
    Enforces tenant isolation for institutional users while granting platform-wide audit access to Super Admin.
    """
    queryset = AuditLog.objects.select_related('college', 'actor').all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdminOrIQAC]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AuditLogFilter
    search_fields = ['actor_email', 'action', 'object_repr', 'comment', 'model_name']
    ordering_fields = ['created_at', 'action', 'actor_role']
    ordering = ['-created_at']

    @action(detail=False, methods=['get'], permission_classes=[IsSuperAdmin], url_path='platform')
    def platform(self, request):
        """
        Super Admin endpoint to view platform-level administrative actions.
        """
        platform_actions = [
            'COLLEGE_CREATED', 'COLLEGE_ACTIVATED', 'COLLEGE_SUSPENDED',
            'COLLEGE_ARCHIVED', 'COLLEGE_RESTORED', 'PLAN_CREATED', 'PLAN_UPDATED',
            'PLAN_CHANGED', 'FEATURE_TOGGLED', 'INVITATION_SENT',
            'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_CANCELLED', 'SETUP_COMPLETED',
            'MAINTENANCE_MODE_TOGGLED', 'SUPPORT_TICKET_CREATED', 'SUPPORT_TICKET_RESOLVED'
        ]
        qs = AuditLog.objects.filter(action__in=platform_actions).order_by('-created_at')
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)
