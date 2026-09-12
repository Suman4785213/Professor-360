from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from core.mixins import TenantMixin
from core.permissions import IsSuperAdminOrIQAC
from apps.audit.utils import log_action
from .models import Department
from .serializers import DepartmentSerializer


class DepartmentViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = Department.objects.all().select_related('college', 'hod', 'incharge')
    serializer_class = DepartmentSerializer
    filterset_fields = ['college', 'is_active']
    search_fields = ['name', 'code']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'activate', 'deactivate']:
            return [IsSuperAdminOrIQAC()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        dept = serializer.save()
        log_action(
            actor=user,
            action='DEPARTMENT_CREATED',
            instance=dept,
            request=self.request,
            comment=f'Created department {dept.name} ({dept.code}).'
        )

    def perform_update(self, serializer):
        dept = serializer.save()
        log_action(
            actor=self.request.user,
            action='DEPARTMENT_UPDATED',
            instance=dept,
            request=self.request,
            comment=f'Updated department {dept.name} ({dept.code}).'
        )

    @action(detail=True, methods=['patch'], url_path='activate')
    def activate(self, request, pk=None):
        dept = self.get_object()
        dept.is_active = True
        dept.save(update_fields=['is_active'])
        log_action(
            actor=request.user,
            action='DEPARTMENT_ACTIVATED',
            instance=dept,
            request=request,
            comment=f'Activated department {dept.name}.'
        )
        return Response({'success': True, 'message': f'Department {dept.name} activated.'})

    @action(detail=True, methods=['patch'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        dept = self.get_object()
        dept.is_active = False
        dept.save(update_fields=['is_active'])
        log_action(
            actor=request.user,
            action='DEPARTMENT_DEACTIVATED',
            instance=dept,
            request=request,
            comment=f'Deactivated department {dept.name}.'
        )
        return Response({'success': True, 'message': f'Department {dept.name} deactivated.'})
