"""
Controlled Data Export Service (Phase 14)
Enforces strict role permissions:
- Faculty: Only own submissions and activities.
- In-charge / HOD: Restricted strictly to assigned department.
- IQAC / Management: College-wide authorized datasets.
- Super Admin: Platform administrative exports.
Produces clean .xlsx and .csv files.
"""
import io
import csv
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from typing import Tuple, Dict, Any, List, Optional
from django.utils import timezone

from apps.accounts.models import User, FacultyProfile, UserRole
from apps.activities.models import Activity
from apps.evidence.models import Evidence


class ExportService:
    """
    Role-permissioned export engine.
    """

    @classmethod
    def export_data(
        cls,
        user: User,
        data_type: str,
        export_format: str = 'XLSX',
        filters: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Any, str, str]:
        """
        Exports data scoped to the requesting user's role and tenant.
        Returns: (file_buffer, content_type, filename)
        """
        filters = filters or {}
        college = user.college

        if data_type == 'FACULTY':
            headers, rows = cls._get_faculty_export(user, college, filters)
        elif data_type == 'ACTIVITIES':
            headers, rows = cls._get_activities_export(user, college, filters)
        elif data_type == 'EVIDENCE':
            headers, rows = cls._get_evidence_export(user, college, filters)
        else:
            raise ValueError(f"Unsupported export dataset '{data_type}'")

        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{data_type.lower()}_export_{timestamp}.{export_format.lower()}"

        if export_format.upper() == 'CSV':
            buffer = io.StringIO()
            writer = csv.writer(buffer)
            writer.writerow(headers)
            for r in rows:
                writer.writerow(r)
            buffer.seek(0)
            return buffer.getvalue().encode('utf-8'), 'text/csv', filename
        else:
            buffer = io.BytesIO()
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = data_type[:30]

            header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
            header_fill = PatternFill(start_color='1E293B', end_color='1E293B', fill_type='solid')
            border_side = Side(style='thin', color='E2E8F0')
            border = Border(left=border_side, right=border_side, top=border_side, bottom=border_side)

            ws.append(headers)
            ws.row_dimensions[1].height = 26
            for col_idx in range(1, len(headers) + 1):
                c = ws.cell(row=1, column=col_idx)
                c.font = header_font
                c.fill = header_fill
                c.alignment = Alignment(horizontal='center', vertical='center')
                c.border = border

            for row_data in rows:
                ws.append(row_data)
                curr_row = ws.max_row
                for col_idx in range(1, len(row_data) + 1):
                    ws.cell(row=curr_row, column=col_idx).border = border

            for col in ws.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = openpyxl.utils.get_column_letter(col[0].column)
                ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

            wb.save(buffer)
            buffer.seek(0)
            return buffer.getvalue(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename

    @classmethod
    def _get_faculty_export(cls, user: User, college, filters: Dict) -> Tuple[List[str], List[List[Any]]]:
        headers = ['Employee ID', 'Name', 'Email', 'Phone', 'Department', 'Designation', 'Qualification', 'Joining Date', 'Status']
        qs = FacultyProfile.objects.select_related('user', 'department')

        # Role scoping
        if user.role == UserRole.FACULTY:
            qs = qs.filter(user=user)
        elif user.role in (UserRole.HOD, UserRole.DEPARTMENT_INCHARGE):
            qs = qs.filter(college=college, department=user.department)
        elif user.role in (UserRole.IQAC, UserRole.COLLEGE_MANAGEMENT):
            qs = qs.filter(college=college)
        elif user.role == UserRole.SUPER_ADMIN:
            if college:
                qs = qs.filter(college=college)
        else:
            return headers, []

        rows = []
        for fp in qs:
            rows.append([
                fp.employee_id or '',
                fp.user.get_full_name(),
                fp.user.email,
                fp.phone or fp.user.phone or '',
                fp.department.name if fp.department else '',
                fp.designation or '',
                fp.qualification or '',
                str(fp.joining_date) if fp.joining_date else '',
                fp.status,
            ])
        return headers, rows

    @classmethod
    def _get_activities_export(cls, user: User, college, filters: Dict) -> Tuple[List[str], List[List[Any]]]:
        headers = ['ID', 'Title', 'Faculty', 'Department', 'Category', 'Academic Year', 'Organizer', 'Start Date', 'End Date', 'Status', 'Verified']
        qs = Activity.objects.select_related('faculty', 'department', 'category', 'academic_year')

        # Role scoping
        if user.role == UserRole.FACULTY:
            qs = qs.filter(faculty=user)
        elif user.role in (UserRole.HOD, UserRole.DEPARTMENT_INCHARGE):
            qs = qs.filter(college=college, department=user.department)
        elif user.role in (UserRole.IQAC, UserRole.COLLEGE_MANAGEMENT):
            qs = qs.filter(college=college)
        elif user.role == UserRole.SUPER_ADMIN:
            if college:
                qs = qs.filter(college=college)
        else:
            return headers, []

        rows = []
        for a in qs:
            rows.append([
                str(a.id),
                a.title,
                a.faculty.get_full_name() if a.faculty else '',
                a.department.name if a.department else '',
                a.category.name if a.category else (a.activity_type or ''),
                a.academic_year.name if a.academic_year else '',
                a.organizer or '',
                str(a.start_date) if a.start_date else '',
                str(a.end_date) if a.end_date else '',
                a.status,
                'Yes' if a.is_verified else 'No',
            ])
        return headers, rows

    @classmethod
    def _get_evidence_export(cls, user: User, college, filters: Dict) -> Tuple[List[str], List[List[Any]]]:
        headers = ['Evidence ID', 'Title', 'Category', 'Faculty', 'Department', 'Academic Year', 'Verified At', 'Status']
        qs = Evidence.objects.select_related('faculty', 'department', 'academic_year')

        # Role scoping
        if user.role == UserRole.FACULTY:
            qs = qs.filter(faculty=user)
        elif user.role in (UserRole.HOD, UserRole.DEPARTMENT_INCHARGE):
            qs = qs.filter(college=college, department=user.department)
        elif user.role in (UserRole.IQAC, UserRole.COLLEGE_MANAGEMENT):
            qs = qs.filter(college=college)
        elif user.role == UserRole.SUPER_ADMIN:
            if college:
                qs = qs.filter(college=college)
        else:
            return headers, []

        rows = []
        for ev in qs:
            rows.append([
                str(ev.id),
                ev.title,
                ev.category or '',
                ev.faculty.get_full_name() if ev.faculty else '',
                ev.department.name if ev.department else '',
                ev.academic_year.name if ev.academic_year else '',
                str(ev.verified_at) if ev.verified_at else '',
                ev.status,
            ])
        return headers, rows
