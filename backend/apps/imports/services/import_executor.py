"""
Import Executor Service (Phase 14)
Executes validated spreadsheet data transactionally.
Guarantees:
- Zero partial data corruption (atomic commit with savepoint protection).
- Imported activities strictly initialize in DRAFT state (never verified).
- Imported users strictly receive FACULTY role (no unauthorized privileges).
"""
import logging
import secrets
from typing import Dict, Any, List
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User, FacultyProfile, UserRole, FacultyStatus
from apps.departments.models import Department
from apps.programs.models import Program
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityStatus, ActivityCategory
from apps.imports.models import ImportJob, ImportJobStatus, ImportDataType, ImportMode
from apps.imports.services.validation_service import ImportValidationService, parse_flexible_date
from apps.notifications.utils import notify_user

logger = logging.getLogger(__name__)


class ImportExecutor:
    """
    Transaction-safe execution engine for validated import jobs.
    """

    def __init__(self, job: ImportJob):
        self.job = job
        self.college = job.college
        self.validator = ImportValidationService(job)

    def execute(self, raw_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Executes import across all rows using database transactions.
        """
        self.job.status = ImportJobStatus.IMPORTING
        self.job.save(update_fields=['status'])

        success_count = 0
        error_count = 0
        errors = []

        try:
            with transaction.atomic():
                for idx, row in enumerate(raw_rows):
                    row_num = idx + 2
                    mapped = self.validator._map_row(row)
                    sid = transaction.savepoint()
                    try:
                        if self.job.data_type == ImportDataType.FACULTY:
                            self._import_faculty_row(mapped)
                        elif self.job.data_type in (ImportDataType.ACTIVITIES, ImportDataType.EVIDENCE_METADATA):
                            self._import_activity_row(mapped)
                        elif self.job.data_type == ImportDataType.DEPARTMENTS:
                            self._import_department_row(mapped)
                        elif self.job.data_type == ImportDataType.PROGRAMS:
                            self._import_program_row(mapped)
                        elif self.job.data_type == ImportDataType.ACADEMIC_YEARS:
                            self._import_academic_year_row(mapped)
                        else:
                            raise ValueError(f"Unsupported data type {self.job.data_type}")

                        transaction.savepoint_commit(sid)
                        success_count += 1
                    except Exception as row_exc:
                        transaction.savepoint_rollback(sid)
                        error_count += 1
                        errors.append({
                            'row': row_num,
                            'error': str(row_exc),
                        })
                        logger.warning(f"Import row {row_num} failed: {row_exc}")

                # Update job stats
                self.job.imported_count = success_count
                self.job.error_count = error_count
                self.job.completed_at = timezone.now()

                if error_count == 0:
                    self.job.status = ImportJobStatus.COMPLETED
                elif success_count > 0:
                    self.job.status = ImportJobStatus.COMPLETED_WITH_ERRORS
                else:
                    self.job.status = ImportJobStatus.FAILED

                self.job.save()

                # Dispatch in-app notification
                try:
                    notify_user(
                        recipient=self.job.user,
                        sender=self.job.user,
                        notification_type='SYSTEM',
                        title=f"Import {self.job.get_status_display()}",
                        body=f"Successfully imported {success_count} {self.job.get_data_type_display()} records ({error_count} failed).",
                        action_url='/imports/history',
                        action_label='View Import History',
                    )
                except Exception as notif_err:
                    logger.warning(f"Could not dispatch import completion notification: {notif_err}")

                return {
                    'status': self.job.status,
                    'imported_count': success_count,
                    'error_count': error_count,
                    'errors': errors[:50],
                }

        except Exception as batch_exc:
            self.job.status = ImportJobStatus.FAILED
            self.job.completed_at = timezone.now()
            self.job.save(update_fields=['status', 'completed_at'])
            logger.error(f"Critical failure during batch import execution: {batch_exc}")
            raise

    def _import_faculty_row(self, data: Dict[str, Any]):
        email = str(data.get('email', '')).strip().lower()
        first_name = str(data.get('first_name', '')).strip()
        last_name = str(data.get('last_name', '')).strip()
        emp_id = str(data.get('employee_id', '')).strip()
        designation = str(data.get('designation', '')).strip()
        qualification = str(data.get('qualification', '')).strip()
        phone = str(data.get('phone', '')).strip()
        joining_date = parse_flexible_date(data.get('joining_date'))
        dept = self.validator.resolve_department(data.get('department'))

        if not dept:
            raise ValueError(f"Department '{data.get('department')}' not found.")

        # Check existing user
        user = User.objects.filter(college=self.college, email=email).first()
        if user:
            if self.job.mode == ImportMode.INSERT_AND_UPDATE:
                if first_name:
                    user.first_name = first_name
                if last_name:
                    user.last_name = last_name
                if phone:
                    user.phone = phone
                if emp_id:
                    user.employee_id = emp_id
                if designation:
                    user.designation = designation
                user.department = dept
                user.save()

                fp = getattr(user, 'faculty_profile', None)
                if fp:
                    fp.department = dept
                    if emp_id:
                        fp.employee_id = emp_id
                    if designation:
                        fp.designation = designation
                    if qualification:
                        fp.qualification = qualification
                    if joining_date:
                        fp.joining_date = joining_date
                    if phone:
                        fp.phone = phone
                    fp.save()
            else:
                raise ValueError(f"Faculty with email '{email}' already exists.")
        else:
            # Create new faculty with strict FACULTY role
            random_pw = secrets.token_urlsafe(16)
            user = User.objects.create(
                email=email,
                first_name=first_name,
                last_name=last_name or 'Faculty',
                phone=phone,
                employee_id=emp_id,
                designation=designation or 'Faculty Member',
                role=UserRole.FACULTY,
                college=self.college,
                department=dept,
                is_active=True,
                is_staff=False,
            )
            user.set_password(random_pw)
            user.save()

            FacultyProfile.objects.create(
                user=user,
                college=self.college,
                department=dept,
                employee_id=emp_id,
                designation=designation or 'Faculty Member',
                qualification=qualification,
                joining_date=joining_date,
                phone=phone,
                status=FacultyStatus.ACTIVE,
            )

    def _import_activity_row(self, data: Dict[str, Any]):
        title = str(data.get('title', '')).strip()
        faculty = self.validator.resolve_faculty(data.get('faculty'))
        if not faculty:
            raise ValueError(f"Faculty '{data.get('faculty')}' could not be resolved.")

        dept_raw = data.get('department') or (faculty.department.code if faculty.department else None)
        dept = self.validator.resolve_department(dept_raw) or faculty.department
        if not dept:
            raise ValueError("Department could not be resolved for activity.")

        ay = self.validator.resolve_academic_year(data.get('academic_year'))
        start_date = parse_flexible_date(data.get('start_date'))
        end_date = parse_flexible_date(data.get('end_date'))
        organizer = str(data.get('organizer', '')).strip()
        venue = str(data.get('venue', '')).strip()
        location = str(data.get('location', '')).strip()
        cert_no = str(data.get('certificate_number', '')).strip()
        description = str(data.get('description', '')).strip()

        # Category resolution
        cat_name = str(data.get('category', '')).strip().lower()
        category = self.validator._categories.get(cat_name)

        # Check existing draft activity
        existing = Activity.objects.filter(
            college=self.college,
            faculty=faculty,
            title__iexact=title,
        ).first()

        if existing:
            if existing.is_verified:
                raise ValueError("Cannot overwrite an already verified institutional evidence record.")
            if self.job.mode == ImportMode.INSERT_AND_UPDATE:
                existing.organizer = organizer or existing.organizer
                existing.venue = venue or existing.venue
                existing.location = location or existing.location
                existing.start_date = start_date or existing.start_date
                existing.end_date = end_date or existing.end_date
                existing.certificate_number = cert_no or existing.certificate_number
                existing.description = description or existing.description
                if category:
                    existing.category = category
                if ay:
                    existing.academic_year = ay
                existing.source = 'IMPORT'
                existing.import_job_id = self.job.id
                # Enforce DRAFT status
                existing.status = ActivityStatus.DRAFT
                existing.save()
            else:
                raise ValueError(f"Activity '{title}' already exists for this faculty.")
        else:
            Activity.objects.create(
                college=self.college,
                department=dept,
                faculty=faculty,
                academic_year=ay,
                category=category,
                title=title,
                organizer=organizer,
                venue=venue,
                location=location,
                start_date=start_date,
                end_date=end_date,
                certificate_number=cert_no,
                description=description,
                # CRITICAL: Always starts in DRAFT!
                status=ActivityStatus.DRAFT,
                source='IMPORT',
                import_job_id=self.job.id,
            )

    def _import_department_row(self, data: Dict[str, Any]):
        name = str(data.get('name', '')).strip()
        code = str(data.get('code', '')).strip().upper()
        description = str(data.get('description', '')).strip()

        dept = Department.objects.filter(college=self.college, code__iexact=code).first()
        if dept:
            if self.job.mode == ImportMode.INSERT_AND_UPDATE:
                dept.name = name or dept.name
                dept.description = description or dept.description
                dept.is_deleted = False
                dept.save()
            else:
                raise ValueError(f"Department code '{code}' already exists.")
        else:
            Department.objects.create(
                college=self.college,
                name=name,
                code=code,
                description=description,
            )

    def _import_program_row(self, data: Dict[str, Any]):
        name = str(data.get('name', '')).strip()
        code = str(data.get('code', '')).strip().upper()
        degree = str(data.get('degree', 'B.Tech')).strip()
        dept = self.validator.resolve_department(data.get('department'))
        if not dept:
            raise ValueError(f"Department '{data.get('department')}' not found.")

        duration = int(data.get('duration_years', 4) or 4)

        prog = Program.objects.filter(college=self.college, code__iexact=code).first()
        if prog:
            if self.job.mode == ImportMode.INSERT_AND_UPDATE:
                prog.name = name or prog.name
                prog.degree = degree or prog.degree
                prog.department = dept
                prog.duration_years = duration
                prog.is_deleted = False
                prog.save()
            else:
                raise ValueError(f"Program code '{code}' already exists.")
        else:
            Program.objects.create(
                college=self.college,
                department=dept,
                name=name,
                code=code,
                degree=degree,
                duration_years=duration,
            )

    def _import_academic_year_row(self, data: Dict[str, Any]):
        name = str(data.get('name', '')).strip()
        s_date = parse_flexible_date(data.get('start_date'))
        e_date = parse_flexible_date(data.get('end_date'))

        if not s_date or not e_date:
            raise ValueError("Valid start and end dates required.")

        ay = AcademicYear.objects.filter(college=self.college, name__iexact=name).first()
        if ay:
            if self.job.mode == ImportMode.INSERT_AND_UPDATE:
                ay.start_date = s_date
                ay.end_date = e_date
                ay.is_deleted = False
                ay.save()
            else:
                raise ValueError(f"Academic year '{name}' already exists.")
        else:
            AcademicYear.objects.create(
                college=self.college,
                name=name,
                start_date=s_date,
                end_date=e_date,
                is_active=True,
            )
