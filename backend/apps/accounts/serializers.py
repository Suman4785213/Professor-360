"""
Accounts — Serializers
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from apps.colleges.models import College
from apps.departments.models import Department
from .models import User, UserRole, FacultyProfile, PasswordResetToken


class FacultyProfileSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    college_name = serializers.CharField(source='college.name', read_only=True)

    class Meta:
        model = FacultyProfile
        fields = [
            'id', 'user', 'user_name', 'user_email',
            'college', 'college_name', 'department', 'department_name',
            'employee_id', 'designation', 'qualification', 'joining_date',
            'phone', 'profile_photo', 'status', 'bio',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'college', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    college_name = serializers.SerializerMethodField()
    faculty_profile = FacultyProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'employee_id', 'designation', 'role',
            'college', 'college_name', 'department', 'department_name',
            'avatar', 'bio', 'is_active', 'is_email_verified',
            'faculty_profile', 'date_joined', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'date_joined', 'created_at', 'updated_at', 'is_email_verified']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    def get_college_name(self, obj):
        return obj.college.name if obj.college else None


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'phone',
            'employee_id', 'designation', 'role',
            'college', 'department', 'password', 'confirm_password',
        ]

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        validate_password(data['password'])

        role = data.get('role', UserRole.FACULTY)
        college = data.get('college')
        department = data.get('department')

        # Requirement #11: Department-based roles require department assignment
        if role in [UserRole.FACULTY, UserRole.HOD, UserRole.DEPARTMENT_INCHARGE]:
            if not department:
                raise serializers.ValidationError({
                    'department': f'Department assignment is required for role: {role}'
                })
            # If college is provided, ensure department belongs to that college
            if college and department.college != college:
                raise serializers.ValidationError({
                    'department': 'Selected department does not belong to the selected college.'
                })
            # Inherit college from department if not explicitly given
            if not college and department:
                data['college'] = department.college

        # Institutional roles require college
        if role in [UserRole.COLLEGE_MANAGEMENT, UserRole.IQAC]:
            if not college and not (department and department.college):
                raise serializers.ValidationError({
                    'college': f'College assignment is required for role: {role}'
                })

        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()

        # Automatically create FacultyProfile for FACULTY role
        if user.role == UserRole.FACULTY and user.college and user.department:
            FacultyProfile.objects.get_or_create(
                user=user,
                defaults={
                    'college': user.college,
                    'department': user.department,
                    'employee_id': user.employee_id,
                    'designation': user.designation,
                    'phone': user.phone,
                }
            )

        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone',
            'employee_id', 'designation', 'avatar', 'bio',
            'department', 'role', 'is_active',
        ]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'new_password': 'Passwords do not match.'})
        validate_password(data['new_password'])
        return data


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'new_password': 'Passwords do not match.'})
        validate_password(data['new_password'])
        return data


class MeSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    college_name = serializers.SerializerMethodField()
    college_logo = serializers.SerializerMethodField()
    faculty_profile = FacultyProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'employee_id', 'designation', 'role',
            'college', 'college_name', 'college_logo',
            'department', 'department_name',
            'avatar', 'bio', 'is_active', 'is_email_verified',
            'faculty_profile',
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    def get_college_name(self, obj):
        return obj.college.name if obj.college else None

    def get_college_logo(self, obj):
        if obj.college and obj.college.logo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.college.logo.url) if request else obj.college.logo.url
        return None


class FacultyRegisterSerializer(serializers.Serializer):
    """
    Self-registration serializer for faculty members from the login page.
    Requires selecting an active College and Department.
    Enforces password validation, unique email, and automatically creates FacultyProfile.
    """
    college = serializers.PrimaryKeyRelatedField(
        queryset=College.objects.filter(is_deleted=False)
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.filter(is_active=True)
    )
    first_name = serializers.CharField(max_length=150, required=True)
    last_name = serializers.CharField(max_length=150, required=True)
    email = serializers.EmailField(required=True)
    employee_id = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    designation = serializers.CharField(max_length=100, required=False, allow_blank=True, default='Assistant Professor')
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        validate_password(data['password'])

        email = data['email'].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({'email': 'An account with this email address already exists.'})

        college = data['college']
        department = data['department']
        if department.college_id != college.id:
            raise serializers.ValidationError({'department': 'Selected department does not belong to the selected college.'})

        return data

    def create(self, validated_data):
        import uuid
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        email = validated_data.pop('email').strip().lower()
        college = validated_data.pop('college')
        department = validated_data.pop('department')
        employee_id = validated_data.get('employee_id', '').strip()
        if not employee_id:
            employee_id = f"FAC-{str(uuid.uuid4())[:6].upper()}"
        validated_data['employee_id'] = employee_id

        user = User.objects.create(
            email=email,
            college=college,
            department=department,
            role=UserRole.FACULTY,
            is_active=True,
            **validated_data
        )
        user.set_password(password)
        user.save()

        FacultyProfile.objects.get_or_create(
            user=user,
            defaults={
                'college': college,
                'department': department,
                'employee_id': employee_id,
                'designation': validated_data.get('designation', 'Assistant Professor'),
                'phone': validated_data.get('phone', ''),
            }
        )

        return user

