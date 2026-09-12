from rest_framework import serializers
from .models import Department
from apps.accounts.models import User


class DepartmentUserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'designation']


class DepartmentSerializer(serializers.ModelSerializer):
    hod_details = DepartmentUserSimpleSerializer(source='hod', read_only=True)
    incharge_details = DepartmentUserSimpleSerializer(source='incharge', read_only=True)
    faculty_count = serializers.IntegerField(source='users.count', read_only=True)

    class Meta:
        model = Department
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
