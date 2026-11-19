"""
Accounts — Serializers
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from apps.colleges.models import College, CollegeStatus
from apps.departments.models import Department
from .models import User, UserRole, FacultyProfile, PasswordResetToken


class RejectForbiddenFieldsMixin:
    forbidden_fields = set()

    def to_internal_value(self, data):
        forbidden = self.forbidden_fields.intersection(data.keys())
        if forbidden:
            raise serializers.ValidationError({key: 'This field cannot be changed here.' for key in forbidden})
        return super().to_internal_value(data)


class PersonalProfileUpdateSerializer(RejectForbiddenFieldsMixin, serializers.ModelSerializer):
    forbidden_fields = {'role', 'college', 'college_id', 'department', 'department_id',
                        'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions',
                        'password', 'is_email_verified'}

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'employee_id', 'designation', 'avatar', 'bio']


def validate_user_assignment(serializer, data):
    actor = serializer.context['request'].user
    instance = serializer.instance
    role = data.get('role', instance.role if instance else UserRole.FACULTY)
    college = data.get('college', instance.college if instance else actor.college)
    department = data.get('department', instance.department if instance else None)
    if actor.role != UserRole.SUPER_ADMIN:
        if not actor.college_id or (college and college.id != actor.college_id):
            raise serializers.ValidationError({'college': 'Accounts must belong to your institution.'})
        if role not in (UserRole.FACULTY, UserRole.HOD, UserRole.DEPARTMENT_INCHARGE):
            raise serializers.ValidationError({'role': 'Only Super Admin may assign institutional administrators.'})
        if instance and instance.role not in (UserRole.FACULTY, UserRole.HOD, UserRole.DEPARTMENT_INCHARGE):
            raise serializers.ValidationError({'role': 'Only Super Admin may manage this account.'})
        college = actor.college
        if not instance:
            data['college'] = college
    if department and (not college or department.college_id != college.id):
        raise serializers.ValidationError({'department': 'Department must belong to the account institution.'})
    if role in (UserRole.FACULTY, UserRole.HOD, UserRole.DEPARTMENT_INCHARGE) and not department:
        raise serializers.ValidationError({'department': 'Department assignment is required.'})
    return data


class FacultyProfileSerializer(RejectForbiddenFieldsMixin, serializers.ModelSerializer):
    forbidden_fields = {'user', 'user_id', 'college', 'college_id', 'department', 'department_id', 'role', 'is_active', 'is_staff', 'is_superuser'}

    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    college_name = serializers.CharField(source='college.name', read_only=True)
    resume_url = serializers.SerializerMethodField()
    experience_duration = serializers.SerializerMethodField()

    class Meta:
        model = FacultyProfile
        fields = [
            'id', 'user', 'user_name', 'user_email',
            'college', 'college_name', 'department', 'department_name',
            'employee_id', 'designation', 'qualification', 'joining_date',
            'phone', 'profile_photo', 'resume', 'resume_url',
            'experience_years', 'experience_duration', 'status', 'bio',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'college', 'department', 'created_at', 'updated_at']

    def get_resume_url(self, obj):
        if obj.resume:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.resume.url)
            return obj.resume.url
        return None

    def get_experience_duration(self, obj):
        if obj.joining_date:
            from django.utils import timezone
            today = timezone.now().date()
            diff_years = today.year - obj.joining_date.year - ((today.month, today.day) < (obj.joining_date.month, obj.joining_date.day))
            diff_months = (today.month - obj.joining_date.month) % 12
            if diff_years > 0:
                return f"{diff_years} year{'s' if diff_years != 1 else ''}, {diff_months} month{'s' if diff_months != 1 else ''}"
            return f"{diff_months} month{'s' if diff_months != 1 else ''}"
        elif obj.experience_years:
            return f"{obj.experience_years} year{'s' if obj.experience_years != 1 else ''}"
        return "Not specified"


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


class UserCreateSerializer(RejectForbiddenFieldsMixin, serializers.ModelSerializer):
    forbidden_fields = {'is_staff', 'is_superuser', 'groups', 'user_permissions'}
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

        return validate_user_assignment(self, data)

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


class UserUpdateSerializer(RejectForbiddenFieldsMixin, serializers.ModelSerializer):
    forbidden_fields = {'college', 'college_id', 'is_staff', 'is_superuser', 'groups', 'user_permissions'}

    def validate(self, data):
        return validate_user_assignment(self, data)

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
        queryset=College.objects.filter(is_deleted=False, is_active=True, status=CollegeStatus.ACTIVE)
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
        if college.is_deleted or not college.is_active or college.status != CollegeStatus.ACTIVE:
            raise serializers.ValidationError({'college': 'Selected college is not active or eligible for faculty registration.'})

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

