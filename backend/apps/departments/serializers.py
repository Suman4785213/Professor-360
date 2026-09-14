from rest_framework import serializers
from .models import Department
from apps.accounts.models import User
from apps.activities.models import Activity


class DepartmentUserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'designation']


class DepartmentSerializer(serializers.ModelSerializer):
    hod_details = DepartmentUserSimpleSerializer(source='hod', read_only=True)
    incharge_details = DepartmentUserSimpleSerializer(source='incharge', read_only=True)
    faculty_count = serializers.SerializerMethodField()
    total_fdps = serializers.SerializerMethodField()
    total_publications = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_faculty_count(self, obj):
        return obj.users.filter(is_active=True).count()

    def get_total_fdps(self, obj):
        return Activity.objects.filter(
            department=obj
        ).filter(
            models_q_fdp()
        ).count()

    def get_total_publications(self, obj):
        return Activity.objects.filter(
            department=obj
        ).filter(
            models_q_pub()
        ).count()


def models_q_fdp():
    from django.db.models import Q
    return Q(category__code='FDP') | Q(activity_type='FDP')


def models_q_pub():
    from django.db.models import Q
    return Q(category__code='PUBLICATION') | Q(activity_type='PUBLICATION')
