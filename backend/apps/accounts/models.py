"""
Accounts — User and FacultyProfile Models
Custom User model with role-based access control for IQAC Management System.
"""
import uuid
from datetime import timedelta
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
    SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
    COLLEGE_MANAGEMENT = 'COLLEGE_MANAGEMENT', 'College Management'
    IQAC = 'IQAC', 'IQAC'
    HOD = 'HOD', 'HOD'
    DEPARTMENT_INCHARGE = 'DEPARTMENT_INCHARGE', 'Department In-charge'
    FACULTY = 'FACULTY', 'Faculty'


RoleChoices = UserRole


class FacultyStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    ON_LEAVE = 'ON_LEAVE', 'On Leave'
    RESIGNED = 'RESIGNED', 'Resigned'
    RETIRED = 'RETIRED', 'Retired'


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.SUPER_ADMIN)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model supporting all IQAC roles.
    Uses email as the unique identifier instead of username.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # College tenant (NULL for Super Admin)
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
    )

    # Department (for HOD, In-charge, Faculty)
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
    )

    # Core identity
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    employee_id = models.CharField(max_length=50, blank=True)
    designation = models.CharField(max_length=100, blank=True)

    # Role
    role = models.CharField(
        max_length=30,
        choices=UserRole.choices,
        default=UserRole.FACULTY,
    )

    # Profile
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True)

    # Django required fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'accounts_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name

    @property
    def is_super_admin(self):
        return self.role == UserRole.SUPER_ADMIN

    @property
    def is_iqac(self):
        return self.role == UserRole.IQAC

    @property
    def is_hod(self):
        return self.role == UserRole.HOD

    @property
    def is_incharge(self):
        return self.role == UserRole.DEPARTMENT_INCHARGE

    @property
    def is_faculty(self):
        return self.role == UserRole.FACULTY

    @property
    def is_management(self):
        return self.role == UserRole.COLLEGE_MANAGEMENT


class FacultyProfile(models.Model):
    """
    Dedicated Faculty profile model storing academic qualification,
    employment details, and joining history.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='faculty_profile',
    )
    college = models.ForeignKey(
        'colleges.College',
        on_delete=models.CASCADE,
        related_name='faculty_profiles',
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.CASCADE,
        related_name='faculty_profiles',
    )

    employee_id = models.CharField(max_length=50, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    qualification = models.CharField(max_length=200, blank=True, help_text="e.g. Ph.D, M.Tech, M.E.")
    joining_date = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    profile_photo = models.ImageField(upload_to='faculty/photos/', null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=FacultyStatus.choices,
        default=FacultyStatus.ACTIVE,
    )
    bio = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_facultyprofile'
        verbose_name = 'Faculty Profile'
        verbose_name_plural = 'Faculty Profiles'

    def __str__(self):
        return f"Profile: {self.user.get_full_name()} ({self.employee_id or self.user.email})"

    @property
    def full_name(self):
        return self.user.get_full_name()

    @property
    def email(self):
        return self.user.email


class PasswordResetToken(models.Model):
    """
    Foundation token model for secure forgot/reset password flow.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=100, unique=True, db_index=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_passwordresettoken'
        verbose_name = 'Password Reset Token'

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at
