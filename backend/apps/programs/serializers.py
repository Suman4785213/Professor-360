from rest_framework import serializers
from .models import Program


class ProgramSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    college_name = serializers.CharField(source='college.name', read_only=True)

    class Meta:
        model = Program
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
