from rest_framework import viewsets, permissions
from core.mixins import TenantMixin
from core.permissions import IsSuperAdminOrIQAC
from .models import Program
from .serializers import ProgramSerializer


class ProgramViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = Program.objects.all().select_related('college', 'department')
    serializer_class = ProgramSerializer
    filterset_fields = ['department', 'status', 'degree']
    search_fields = ['name', 'code', 'degree']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdminOrIQAC()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return Program.objects.none()
        if user.role in ['HOD', 'DEPARTMENT_INCHARGE', 'FACULTY'] and user.department:
            return qs.filter(department=user.department)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != 'SUPER_ADMIN':
            serializer.save(college=user.college)
        else:
            serializer.save()
