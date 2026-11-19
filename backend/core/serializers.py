from rest_framework import serializers


class TenantRelationsMixin:
    """Validate tenant ownership of writable model relationships before saving."""
    def to_internal_value(self, data):
        request = self.context.get('request')
        if request and request.user.role != 'SUPER_ADMIN' and 'college' in data:
            if str(data['college']) != str(request.user.college_id):
                raise serializers.ValidationError({'college': 'Institution cannot be reassigned.'})
        return super().to_internal_value(data)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get('request')
        if not request or request.user.role == 'SUPER_ADMIN':
            return attrs
        user = request.user
        if not user.college_id:
            raise serializers.ValidationError('Institution assignment required.')
        for name, obj in attrs.items():
            if not hasattr(obj, '_meta'):
                continue
            college_id = obj.pk if obj._meta.label_lower == 'colleges.college' else getattr(obj, 'college_id', None)
            if college_id is None and hasattr(obj, 'metric'):
                college_id = obj.metric.college_id
            if college_id is not None and college_id != user.college_id:
                raise serializers.ValidationError({name: 'Related record is outside your institution.'})
        return attrs
