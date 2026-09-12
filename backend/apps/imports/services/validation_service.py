"""
Import Validation Service (Phase 14)
Validates imported spreadsheet rows, resolves tenant foreign keys,
detects duplicate records, and tags rows for safe execution.
"""
import re
from datetime import datetime, date
from typing import Dict, Any, List, Tuple, Optional
from django.utils import timezone

from apps.accounts.models import User, FacultyProfile, UserRole
from apps.departments.models import Department
from apps.programs.models import Program
from apps.academic_years.models import AcademicYear
from apps.activities.models import Activity, ActivityCategory, ActivityType, ActivityStatus
from apps.imports.models import ImportJob, ImportDataType, ImportMode


EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')


def parse_flexible_date(val: Any) -> Optional[date]:
    """
    Parses dates in multiple common formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY.
    """
    if not val:
        return None
    if isinstance(val, (date, datetime)):
        return val.date() if isinstance(val, datetime) else val

    val_str = str(val).strip()
    formats = [
        '%Y-%m-%d',
        '%d/%m/%Y',
        '%d-%m-%Y',
        '%m/%d/%Y',
        '%d.%m.%Y',
        '%Y/%m/%d',
        '%Y',
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(val_str, fmt)
            return dt.date()
        except ValueError:
            continue
    return None


class ImportValidationService:
    """
    Validates imported spreadsheet rows against tenant models.
    """

    def __init__(self, job: ImportJob):
        self.job = job
        self.college = job.college
        self.data_type = job.data_type
        self.mode = job.mode
        self.column_mapping = job.column_mapping or {}
        self.reference_mapping = job.reference_mapping or {}

        # Pre-cache tenant reference data for fast bulk validation
        self._departments = {d.code.upper(): d for d in Department.objects.filter(college=self.college, is_deleted=False)}
        self._departments_by_name = {d.name.lower(): d for d in self._departments.values()}

        self._academic_years = {ay.name.upper(): ay for ay in AcademicYear.objects.filter(college=self.college, is_deleted=False)}
        self._categories = {c.name.lower(): c for c in ActivityCategory.objects.filter(college=self.college, is_active=True)}
        # Also include system defaults (college=None)
        for c in ActivityCategory.objects.filter(college=None, is_active=True):
            if c.name.lower() not in self._categories:
                self._categories[c.name.lower()] = c

        self._faculty_by_email = {u.email.lower(): u for u in User.objects.filter(college=self.college)}
        self._faculty_by_emp_id = {}
        for fp in FacultyProfile.objects.filter(college=self.college).select_related('user'):
            if fp.employee_id:
                self._faculty_by_emp_id[fp.employee_id.upper()] = fp.user

    def resolve_department(self, raw_val: Any) -> Optional[Department]:
        if not raw_val:
            return None
        val_str = str(raw_val).strip()
        # Check reference mapping alias first
        if val_str in self.reference_mapping:
            dept_id = self.reference_mapping[val_str]
            return Department.objects.filter(id=dept_id, college=self.college).first()

        # Check by code
        if val_str.upper() in self._departments:
            return self._departments[val_str.upper()]

        # Check by name
        if val_str.lower() in self._departments_by_name:
            return self._departments_by_name[val_str.lower()]

        return None

    def resolve_academic_year(self, raw_val: Any) -> Optional[AcademicYear]:
        if not raw_val:
            # Fallback to current academic year if available
            return AcademicYear.objects.filter(college=self.college, is_current=True, is_deleted=False).first()
        val_str = str(raw_val).strip().upper()
        if val_str in self._academic_years:
            return self._academic_years[val_str]
        # Normalize 2024-2025 to 2024-25
        normalized = val_str.replace('20', '', 2) if len(val_str) == 9 and '-' in val_str else val_str
        return self._academic_years.get(normalized)

    def resolve_faculty(self, raw_val: Any) -> Optional[User]:
        if not raw_val:
            return None
        val_str = str(raw_val).strip()
        # By email
        if val_str.lower() in self._faculty_by_email:
            return self._faculty_by_email[val_str.lower()]
        # By employee ID
        if val_str.upper() in self._faculty_by_emp_id:
            return self._faculty_by_emp_id[val_str.upper()]
        return None

    def validate_rows(self, raw_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validates a list of raw spreadsheet rows.
        Returns:
            {
                'total_rows': int,
                'valid_rows': int,
                'warning_count': int,
                'error_count': int,
                'duplicate_count': int,
                'preview': [ { row_number, data, status, errors, warnings } ],
                'error_details': [ { row, field, value, error, suggested_fix } ],
            }
        """
        preview_list = []
        error_details = []
        valid_rows = 0
        warning_count = 0
        error_count = 0
        duplicate_count = 0

        for idx, row in enumerate(raw_rows):
            row_num = idx + 2  # 1-indexed, skipping header
            mapped_data = self._map_row(row)

            # Route to data-type validator
            if self.data_type == ImportDataType.FACULTY:
                row_status, errs, warns = self._validate_faculty_row(row_num, mapped_data)
            elif self.data_type in (ImportDataType.ACTIVITIES, ImportDataType.EVIDENCE_METADATA):
                row_status, errs, warns = self._validate_activity_row(row_num, mapped_data)
            elif self.data_type == ImportDataType.DEPARTMENTS:
                row_status, errs, warns = self._validate_department_row(row_num, mapped_data)
            elif self.data_type == ImportDataType.PROGRAMS:
                row_status, errs, warns = self._validate_program_row(row_num, mapped_data)
            elif self.data_type == ImportDataType.ACADEMIC_YEARS:
                row_status, errs, warns = self._validate_academic_year_row(row_num, mapped_data)
            else:
                row_status = 'VALID'
                errs, warns = [], []

            if errs:
                error_count += 1
                for e in errs:
                    error_details.append({
                        'row': row_num,
                        'field': e.get('field', 'General'),
                        'value': str(e.get('value', '')),
                        'error': e.get('message', ''),
                        'suggested_fix': e.get('fix', 'Review spreadsheet entry.'),
                    })
            else:
                valid_rows += 1

            if warns:
                warning_count += len(warns)

            if row_status in ('DUPLICATE', 'UPDATE'):
                duplicate_count += 1

            # Only retain first 50 rows for frontend preview to keep payload light
            if len(preview_list) < 50:
                preview_list.append({
                    'row_number': row_num,
                    'raw_data': row,
                    'mapped_data': mapped_data,
                    'status': row_status,
                    'errors': errs,
                    'warnings': warns,
                })

        return {
            'total_rows': len(raw_rows),
            'valid_rows': valid_rows,
            'warning_count': warning_count,
            'error_count': error_count,
            'duplicate_count': duplicate_count,
            'preview': preview_list,
            'error_details': error_details[:200],  # cap at 200 for JSON response
        }

    def _map_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        mapped = {}
        for src_col, target_field in self.column_mapping.items():
            if target_field and src_col in row:
                mapped[target_field] = row[src_col]
        return mapped

    def _validate_faculty_row(self, row_num: int, data: Dict[str, Any]) -> Tuple[str, List[Dict], List[str]]:
        errs = []
        warns = []
        status = 'NEW'

        email = str(data.get('email', '')).strip().lower()
        if not email:
            errs.append({'field': 'email', 'value': '', 'message': 'Email address is required.', 'fix': 'Provide a valid faculty institutional email.'})
        elif not EMAIL_REGEX.match(email):
            errs.append({'field': 'email', 'value': email, 'message': 'Invalid email format.', 'fix': 'Format as name@institution.edu'})

        if not data.get('first_name'):
            errs.append({'field': 'first_name', 'value': '', 'message': 'First name is required.', 'fix': 'Enter faculty first name.'})

        dept_raw = data.get('department')
        dept = self.resolve_department(dept_raw)
        if not dept:
            errs.append({
                'field': 'department',
                'value': str(dept_raw or ''),
                'message': f"Department '{dept_raw}' does not exist in your institution.",
                'fix': 'Use existing department code or map reference alias in Step 4.',
            })

        # Check existing user
        emp_id = str(data.get('employee_id', '')).strip()
        existing_user = self._faculty_by_email.get(email)
        existing_emp = self._faculty_by_emp_id.get(emp_id.upper()) if emp_id else None

        if existing_user or existing_emp:
            if self.mode == ImportMode.INSERT_AND_UPDATE:
                status = 'UPDATE'
                warns.append(f"Existing faculty record found for '{email}'. Profile fields will be updated.")
            else:
                status = 'DUPLICATE'
                errs.append({
                    'field': 'email' if existing_user else 'employee_id',
                    'value': email if existing_user else emp_id,
                    'message': 'Duplicate faculty record already exists in college.',
                    'fix': 'Switch to "Insert and Update" mode or remove duplicate row.',
                })

        return status, errs, warns

    def _validate_activity_row(self, row_num: int, data: Dict[str, Any]) -> Tuple[str, List[Dict], List[str]]:
        errs = []
        warns = []
        status = 'NEW'

        title = str(data.get('title', '')).strip()
        if not title:
            errs.append({'field': 'title', 'value': '', 'message': 'Activity title is required.', 'fix': 'Provide activity title.'})

        # Faculty resolution
        faculty_raw = data.get('faculty')
        faculty = self.resolve_faculty(faculty_raw)
        if not faculty:
            errs.append({
                'field': 'faculty',
                'value': str(faculty_raw or ''),
                'message': f"Faculty '{faculty_raw}' not found in college.",
                'fix': 'Provide valid faculty email or employee ID.',
            })

        # Department resolution
        dept_raw = data.get('department') or (faculty.department.code if faculty and faculty.department else None)
        dept = self.resolve_department(dept_raw)
        if not dept:
            errs.append({
                'field': 'department',
                'value': str(dept_raw or ''),
                'message': 'Department could not be resolved.',
                'fix': 'Provide department code or map to existing department.',
            })

        # Start Date
        start_date_raw = data.get('start_date')
        parsed_start_date = parse_flexible_date(start_date_raw)
        if start_date_raw and not parsed_start_date:
            errs.append({
                'field': 'start_date',
                'value': str(start_date_raw),
                'message': 'Invalid start date format.',
                'fix': 'Use format YYYY-MM-DD or DD/MM/YYYY.',
            })

        # Duplicate check on activity title + faculty + start_date
        cert_no = str(data.get('certificate_number', '')).strip()
        if faculty and title:
            existing_act = Activity.objects.filter(
                college=self.college,
                faculty=faculty,
                title__iexact=title,
            ).first()

            if not existing_act and cert_no:
                existing_act = Activity.objects.filter(
                    college=self.college,
                    certificate_number__iexact=cert_no,
                ).first()

            if existing_act:
                if existing_act.is_verified:
                    status = 'DUPLICATE'
                    errs.append({
                        'field': 'title',
                        'value': title,
                        'message': 'Matches an already verified evidence record. Overwriting verified data is prohibited.',
                        'fix': 'Record already verified. Omit this row from import.',
                    })
                elif self.mode == ImportMode.INSERT_AND_UPDATE:
                    status = 'UPDATE'
                    warns.append(f"Matching draft activity found (ID: {existing_act.id}). Details will be updated.")
                else:
                    status = 'DUPLICATE'
                    errs.append({
                        'field': 'title',
                        'value': title,
                        'message': 'Duplicate activity already exists in draft.',
                        'fix': 'Switch to "Insert and Update" mode or skip duplicate.',
                    })

        return status, errs, warns

    def _validate_department_row(self, row_num: int, data: Dict[str, Any]) -> Tuple[str, List[Dict], List[str]]:
        errs = []
        warns = []
        status = 'NEW'

        name = str(data.get('name', '')).strip()
        code = str(data.get('code', '')).strip().upper()

        if not name:
            errs.append({'field': 'name', 'value': '', 'message': 'Department name is required.', 'fix': 'Enter department name.'})
        if not code:
            errs.append({'field': 'code', 'value': '', 'message': 'Department code is required.', 'fix': 'Enter department code (e.g. CSE).'})

        if code in self._departments:
            if self.mode == ImportMode.INSERT_AND_UPDATE:
                status = 'UPDATE'
                warns.append(f"Department code '{code}' exists and will be updated.")
            else:
                status = 'DUPLICATE'
                errs.append({'field': 'code', 'value': code, 'message': f"Department code '{code}' already exists.", 'fix': 'Change code or enable Update mode.'})

        return status, errs, warns

    def _validate_program_row(self, row_num: int, data: Dict[str, Any]) -> Tuple[str, List[Dict], List[str]]:
        errs = []
        warns = []
        status = 'NEW'

        name = str(data.get('name', '')).strip()
        code = str(data.get('code', '')).strip().upper()
        dept_raw = data.get('department')
        dept = self.resolve_department(dept_raw)

        if not name:
            errs.append({'field': 'name', 'value': '', 'message': 'Program name is required.', 'fix': 'Enter program name.'})
        if not code:
            errs.append({'field': 'code', 'value': '', 'message': 'Program code is required.', 'fix': 'Enter program code.'})
        if not dept:
            errs.append({'field': 'department', 'value': str(dept_raw or ''), 'message': 'Department not found.', 'fix': 'Provide valid department.'})

        if Program.objects.filter(college=self.college, code__iexact=code, is_deleted=False).exists():
            if self.mode == ImportMode.INSERT_AND_UPDATE:
                status = 'UPDATE'
            else:
                status = 'DUPLICATE'
                errs.append({'field': 'code', 'value': code, 'message': f"Program code '{code}' already exists.", 'fix': 'Modify code or enable update.'})

        return status, errs, warns

    def _validate_academic_year_row(self, row_num: int, data: Dict[str, Any]) -> Tuple[str, List[Dict], List[str]]:
        errs = []
        warns = []
        status = 'NEW'

        name = str(data.get('name', '')).strip()
        if not name:
            errs.append({'field': 'name', 'value': '', 'message': 'Academic year name required.', 'fix': 'e.g. 2024-25'})

        s_date = parse_flexible_date(data.get('start_date'))
        e_date = parse_flexible_date(data.get('end_date'))
        if not s_date:
            errs.append({'field': 'start_date', 'value': str(data.get('start_date', '')), 'message': 'Start date invalid.', 'fix': 'Use YYYY-MM-DD'})
        if not e_date:
            errs.append({'field': 'end_date', 'value': str(data.get('end_date', '')), 'message': 'End date invalid.', 'fix': 'Use YYYY-MM-DD'})

        if s_date and e_date and s_date >= e_date:
            errs.append({'field': 'end_date', 'value': str(e_date), 'message': 'End date must be after start date.', 'fix': 'Ensure start date precedes end date.'})

        if name.upper() in self._academic_years:
            if self.mode == ImportMode.INSERT_AND_UPDATE:
                status = 'UPDATE'
            else:
                status = 'DUPLICATE'
                errs.append({'field': 'name', 'value': name, 'message': 'Academic year already exists.', 'fix': 'Provide unique academic year.'})

        return status, errs, warns
