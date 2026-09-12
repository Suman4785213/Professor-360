from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from core.mixins import TenantMixin
from core.permissions import IsSuperAdminOrIQAC
from apps.audit.utils import log_action
from .models import AcademicYear
from .serializers import AcademicYearSerializer


class AcademicYearViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    filterset_fields = ['college', 'is_active', 'is_current']
    search_fields = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'set_current']:
            return [IsSuperAdminOrIQAC()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        qs = self.get_queryset().filter(is_current=True).first()
        if not qs:
            qs = self.get_queryset().first()
        if qs:
            serializer = self.get_serializer(qs)
            return Response(serializer.data)
        return Response(None)

    def perform_create(self, serializer):
        ay = serializer.save()
        log_action(
            actor=self.request.user,
            action='ACADEMIC_YEAR_CREATED',
            instance=ay,
            request=self.request,
            comment=f'Created academic year {ay.name}.'
        )

    def perform_update(self, serializer):
        ay = serializer.save()
        log_action(
            actor=self.request.user,
            action='ACADEMIC_YEAR_UPDATED',
            instance=ay,
            request=self.request,
            comment=f'Updated academic year {ay.name}.'
        )

    @action(detail=True, methods=['patch'], url_path='set-current')
    def set_current(self, request, pk=None):
        academic_year = self.get_object()
        academic_year.is_current = True
        academic_year.save()

        log_action(
            actor=request.user,
            action='ACADEMIC_YEAR_ACTIVATED',
            instance=academic_year,
            request=request,
            comment=f'Set {academic_year.name} as active current academic year.'
        )
        return Response({'success': True, 'message': f'{academic_year.name} set as current academic year.'})
