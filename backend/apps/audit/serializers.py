from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    college_name = serializers.CharField(source='college.name', read_only=True)
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'college', 'college_name', 'actor', 'actor_name',
            'actor_role', 'actor_email', 'action', 'model_name',
            'object_id', 'object_repr', 'comment',
            'previous_data', 'new_data', 'ip_address', 'user_agent',
            'created_at'
        ]

    def get_actor_name(self, obj):
        if obj.actor:
            name = f"{obj.actor.first_name} {obj.actor.last_name}".strip()
            return name or obj.actor.email
        return obj.actor_email or 'System'
