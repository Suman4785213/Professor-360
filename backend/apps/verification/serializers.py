from rest_framework import serializers
from .models import VerificationRecord, VerificationLog
from apps.activities.serializers import ActivitySerializer


class VerificationLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.get_full_name', read_only=True)

    class Meta:
        model = VerificationLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class VerificationRecordSerializer(serializers.ModelSerializer):
    activity_details = ActivitySerializer(source='activity', read_only=True)
    logs = VerificationLogSerializer(many=True, read_only=True)

    class Meta:
        model = VerificationRecord
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
