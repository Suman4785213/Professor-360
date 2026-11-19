"""
Report engine services — Phase 6: Automated Report Generation Engine
ReportDataService, PDFReportGenerator, ExcelReportGenerator, WordReportGenerator, and Coordinator.
"""
import os
import io
import re
import datetime
from django.db.models import Q, Count
from django.utils import timezone
from django.core.files.base import ContentFile
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.audit.utils import log_action
from apps.activities.models import Activity, ActivityStatus
from apps.evidence.models import Evidence
from apps.criteria.models import EvidenceMapping, Metric
from .models import GeneratedReport, ReportFormat, ReportStatus, ReportTemplate

# ==============================================================================
# 1. REPORT DATA SERVICE (Decoupled, Verified-Only Data Aggregator)
# ==============================================================================

class ReportDataService:
    """
    Fetches, filters, scopes, and normalizes verified institutional records
    into standard report datasets (Section 15, 16, 17).
    """

    @classmethod
    def get_scoped_data(cls, user, filters, report_type=None):
        """
        Validates user permissions and returns verified activities & evidence
        matching filter parameters.
        """
        college = user.college if user.role != 'SUPER_ADMIN' else getattr(user, 'selected_college', user.college)
        if not college and user.role != 'SUPER_ADMIN':
            raise PermissionDenied("User is not associated with an institution.")

        # Reject foreign filter IDs before they can become report foreign keys or metadata.
        from django.apps import apps
        references = {'academic_year': 'academic_years.AcademicYear', 'department': 'departments.Department',
                      'faculty': 'accounts.User', 'category': 'activities.ActivityCategory',
                      'criterion': 'criteria.Criterion', 'metric': 'criteria.Metric'}
        for field, label in references.items():
            if not filters.get(field):
                continue
            obj = apps.get_model(label).objects.filter(pk=filters[field]).first()
            if not obj or (user.role != 'SUPER_ADMIN' and obj.college_id not in
                           ((None, user.college_id) if field == 'category' else (user.college_id,))):
                raise ValidationError({field: 'Invalid or inaccessible filter.'})
            if field == 'faculty' and user.role in ('HOD', 'DEPARTMENT_INCHARGE') and obj.department_id != user.department_id:
                raise PermissionDenied('Faculty must belong to your department.')

        # Base verified activities query (RULE 1: Only IQAC_VERIFIED / VERIFIED_EVIDENCE)
        activities_qs = Activity.objects.filter(
            status__in=[ActivityStatus.IQAC_VERIFIED, ActivityStatus.VERIFIED_EVIDENCE]
        ).select_related(
            'faculty', 'faculty__faculty_profile', 'department', 'academic_year', 'category', 'college'
        ).prefetch_related('documents')

        if college:
            activities_qs = activities_qs.filter(college=college)

        # Apply role-based scoping (Sections 21-25)
        if user.role == 'FACULTY':
            activities_qs = activities_qs.filter(faculty=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            if not user.department:
                return cls._build_empty_response(college, filters, report_type)
            activities_qs = activities_qs.filter(department=user.department)

        # Filter by Academic Year
        ay_id = filters.get('academic_year')
        if ay_id:
            activities_qs = activities_qs.filter(academic_year_id=ay_id)

        # Filter by Department (if authorized)
        dept_id = filters.get('department')
        if dept_id:
            if user.role in ['HOD', 'DEPARTMENT_INCHARGE'] and str(user.department_id) != str(dept_id):
                raise PermissionDenied("Cannot generate reports for departments other than your assigned department.")
            activities_qs = activities_qs.filter(department_id=dept_id)

        # Filter by Faculty
        fac_id = filters.get('faculty')
        if fac_id:
            if user.role == 'FACULTY' and str(user.id) != str(fac_id):
                raise PermissionDenied("Faculty can only generate individual reports for their own activities.")
            activities_qs = activities_qs.filter(faculty_id=fac_id)

        # Filter by Category
        cat_id = filters.get('category')
        if cat_id:
            activities_qs = activities_qs.filter(category_id=cat_id)
        elif report_type and report_type.category_code:
            # Automatic category filtering for specialized report types (FDP, Workshop, etc.)
            activities_qs = activities_qs.filter(
                Q(category__code__iexact=report_type.category_code) |
                Q(activity_type__iexact=report_type.category_code)
            )

        # Filter by Criteria / Metric Mapping (Section 34)
        metric_id = filters.get('metric')
        criterion_id = filters.get('criterion')
        if metric_id:
            mapped_act_ids = EvidenceMapping.objects.filter(
                metric_id=metric_id, status='ACTIVE'
            ).values_list('evidence__activity_id', flat=True)
            activities_qs = activities_qs.filter(id__in=mapped_act_ids)
        elif criterion_id:
            mapped_act_ids = EvidenceMapping.objects.filter(
                criterion_id=criterion_id, status='ACTIVE'
            ).values_list('evidence__activity_id', flat=True)
            activities_qs = activities_qs.filter(id__in=mapped_act_ids)

        # Date range filtering
        date_from = filters.get('date_from')
        if date_from:
            activities_qs = activities_qs.filter(start_date__gte=date_from)
        date_to = filters.get('date_to')
        if date_to:
            activities_qs = activities_qs.filter(end_date__lte=date_to)

        # Search term if present
        search_query = filters.get('search')
        if search_query:
            activities_qs = activities_qs.filter(
                Q(title__icontains=search_query) |
                Q(organizer__icontains=search_query) |
                Q(faculty__first_name__icontains=search_query) |
                Q(faculty__last_name__icontains=search_query)
            )

        activities = list(activities_qs.order_by('-start_date', 'title'))
        return cls._normalize_report_dataset(college, user, activities, filters, report_type)

    @classmethod
    def _normalize_report_dataset(cls, college, user, activities, filters, report_type):
        """
        Transforms queryset records into a clean, normalized report dictionary (Section 17).
        """
        records = []
        for idx, act in enumerate(activities, 1):
            faculty_profile = getattr(act.faculty, 'faculty_profile', None)
            emp_id = getattr(act.faculty, 'employee_id', '') or (faculty_profile.employee_id if faculty_profile else '')
            designation = getattr(act.faculty, 'designation', '') or (faculty_profile.designation if faculty_profile else '')

            date_str = ""
            if act.start_date and act.end_date:
                if act.start_date == act.end_date:
                    date_str = act.start_date.strftime("%d %b %Y")
                else:
                    date_str = f"{act.start_date.strftime('%d %b %Y')} to {act.end_date.strftime('%d %b %Y')}"
            elif act.start_date:
                date_str = act.start_date.strftime("%d %b %Y")

            records.append({
                'sl_no': idx,
                'id': str(act.id),
                'faculty_name': act.faculty.get_full_name(),
                'faculty_email': act.faculty.email,
                'employee_id': emp_id,
                'designation': designation,
                'department_name': act.department.name if act.department else 'N/A',
                'department_code': act.department.code if act.department else '',
                'activity_title': act.title,
                'category_name': act.category.name if act.category else (act.activity_type or 'General'),
                'activity_type': act.get_activity_type_display() if hasattr(act, 'get_activity_type_display') else act.activity_type,
                'start_date': act.start_date.strftime("%d %b %Y") if act.start_date else '',
                'end_date': act.end_date.strftime("%d %b %Y") if act.end_date else '',
                'date_range': date_str,
                'organizer': act.organizer or 'Institutional',
                'venue': act.venue or act.location or '',
                'duration': act.duration or f"{act.duration_days or 1} Days",
                'is_online': 'Yes' if act.is_online else 'No',
                'certificate_number': act.certificate_number or 'N/A',
                'status': act.status,
                'verified_status': 'IQAC Verified',
            })

        first_rec = activities[0] if activities else None
        ay_name = first_rec.academic_year.name if first_rec and first_rec.academic_year else filters.get('academic_year_name', 'All Academic Cycles')
        dept_name = first_rec.department.name if first_rec and first_rec.department and len(set(a.department_id for a in activities)) == 1 else filters.get('department_name', 'All Departments')

        return {
            'college': {
                'id': str(college.id) if college else '',
                'name': college.name if college else 'Higher Education Institution',
                'code': college.code if college else 'COLLEGE',
                'logo_url': college.logo.url if college and college.logo else None,
                'address': getattr(college, 'address', '') or 'Accredited Higher Education Institution',
                'branding_config': getattr(college, 'branding_config', {}) if college else {},
                'report_header': getattr(college, 'branding_config', {}).get('report_header', '') if college else '',
                'report_footer': getattr(college, 'branding_config', {}).get('report_footer', '') if college else '',
            },
            'meta': {
                'title': cls._build_report_title(report_type, dept_name, ay_name, filters),
                'report_type_code': report_type.code if report_type else 'GENERAL',
                'report_type_name': report_type.name if report_type else 'Institutional Activity Report',
                'academic_year': ay_name,
                'department': dept_name,
                'generated_by': user.get_full_name(),
                'generated_by_email': user.email,
                'generated_at': timezone.now().strftime("%d %b %Y, %I:%M %p"),
                'generated_date': timezone.now().strftime("%d %b %Y"),
                'total_records': len(records),
                'filters_applied': filters,
            },
            'records': records,
        }

    @classmethod
    def _build_empty_response(cls, college, filters, report_type):
        return {
            'college': {
                'name': college.name if college else 'Apex Institute of Technology',
                'code': college.code if college else 'APEX',
                'logo_url': college.logo.url if college and college.logo else None,
            },
            'meta': {
                'title': report_type.name if report_type else 'Activity Report',
                'report_type_code': report_type.code if report_type else 'GENERAL',
                'report_type_name': report_type.name if report_type else 'Activity Report',
                'academic_year': 'N/A',
                'department': 'N/A',
                'generated_by': '',
                'generated_at': timezone.now().strftime("%d %b %Y"),
                'total_records': 0,
                'filters_applied': filters,
            },
            'records': [],
        }

    @staticmethod
    def _build_report_title(report_type, dept_name, ay_name, filters):
        type_title = report_type.name if report_type else "Verified Institutional Activity Report"
        parts = [type_title]
        if dept_name and dept_name != 'All Departments':
            parts.append(dept_name)
        if ay_name and ay_name != 'All Academic Cycles':
            parts.append(f"({ay_name})")
        return " — ".join(parts)


# ==============================================================================
# 2. PDF REPORT GENERATOR (ReportLab with Page-X-of-Y & Modern Layout)
# ==============================================================================

class NumberedCanvas:
    """
    Two-pass canvas for dynamic total page numbering ('Page X of Y').
    """
    def __init__(self, *args, **kwargs):
        from reportlab.pdfgen import canvas
        self._canvas_class = canvas.Canvas
        self.pages = []

    def __call__(self, *args, **kwargs):
        from reportlab.pdfgen import canvas
        class DynamicNumberedCanvas(canvas.Canvas):
            def __init__(self, *c_args, **c_kwargs):
                super().__init__(*c_args, **c_kwargs)
                self._saved_page_states = []

            def showPage(self):
                self._saved_page_states.append(dict(self.__dict__))
                self._startPage()

            def save(self):
                num_pages = len(self._saved_page_states)
                for state in self._saved_page_states:
                    self.__dict__.update(state)
                    self.draw_page_decorations(num_pages)
                    super().showPage()
                super().save()

            def draw_page_decorations(self, page_count):
                from reportlab.lib import colors
                self.saveState()
                self.setFont("Helvetica", 8)
                self.setFillColor(colors.HexColor("#64748b"))
                # Running footer
                footer_text = f"IQAC Accreditation Dossier — Page {self._pageNumber} of {page_count}"
                self.drawRightString(780, 20, footer_text)
                self.drawString(40, 20, "Confidential — Official Institutional Quality Assurance Document")
                # Top header bar (pages > 1)
                if self._pageNumber > 1:
                    self.setStrokeColor(colors.HexColor("#cbd5e1"))
                    self.setLineWidth(0.5)
                    self.line(40, 565, 800, 565)
                    self.drawString(40, 570, "Internal Quality Assurance Cell (IQAC)")
                self.restoreState()

        return DynamicNumberedCanvas(*args, **kwargs)


class PDFReportGenerator:
    """
    Generates high-fidelity, professional PDF reports via ReportLab (Section 12).
    """

    @classmethod
    def generate(cls, report_data):
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter, landscape
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

        buffer = io.BytesIO()
        # Landscape orientation for wide tabular data
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(letter),
            leftMargin=40,
            rightMargin=40,
            topMargin=40,
            bottomMargin=40,
        )

        styles = getSampleStyleSheet()

        # Custom typography styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=4,
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#475569'),
        )
        meta_label_style = ParagraphStyle(
            'MetaLabel',
            fontName='Helvetica-Bold',
            fontSize=8,
            textColor=colors.HexColor('#64748b'),
        )
        meta_val_style = ParagraphStyle(
            'MetaVal',
            fontName='Helvetica',
            fontSize=8,
            textColor=colors.HexColor('#1e293b'),
        )
        th_style = ParagraphStyle(
            'TableHeader',
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.white,
            alignment=0,
        )
        tb_style = ParagraphStyle(
            'TableBody',
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#1e293b'),
        )
        tb_bold_style = ParagraphStyle(
            'TableBodyBold',
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#0f172a'),
        )

        elements = []

        college_name = report_data['college']['name']
        report_title = report_data['meta']['title']
        records = report_data['records']

        # 1. Header Banner
        header_table_data = [
            [
                Paragraph(f"<b>{college_name.upper()}</b>", ParagraphStyle('Coll', fontName='Helvetica-Bold', fontSize=12, textColor=colors.HexColor('#4338ca'))),
                Paragraph("INTERNAL QUALITY ASSURANCE CELL", ParagraphStyle('IQAC', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#64748b'), alignment=2))
            ],
            [
                Paragraph(report_title, title_style),
                Paragraph(f"Generated: {report_data['meta']['generated_at']}", subtitle_style)
            ]
        ]
        h_table = Table(header_table_data, colWidths=[540, 220])
        h_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(h_table)
        elements.append(Spacer(1, 10))

        # 2. Metadata Cards (Summary Box)
        meta_box = [
            [
                Paragraph("Academic Cycle:", meta_label_style),
                Paragraph(f"<b>{report_data['meta']['academic_year']}</b>", meta_val_style),
                Paragraph("Department Scope:", meta_label_style),
                Paragraph(f"<b>{report_data['meta']['department']}</b>", meta_val_style),
                Paragraph("Verified Records:", meta_label_style),
                Paragraph(f"<b>{report_data['meta']['total_records']} verified items</b>", meta_val_style),
            ],
            [
                Paragraph("Report Type:", meta_label_style),
                Paragraph(report_data['meta']['report_type_name'], meta_val_style),
                Paragraph("Generated By:", meta_label_style),
                Paragraph(report_data['meta']['generated_by'], meta_val_style),
                Paragraph("Verification Status:", meta_label_style),
                Paragraph("Official Verified Evidence", ParagraphStyle('Green', fontName='Helvetica-Bold', fontSize=8, textColor=colors.HexColor('#047857'))),
            ]
        ]
        meta_table = Table(meta_box, colWidths=[90, 160, 95, 165, 100, 150])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#f1f5f9')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 14))

        # 3. Data Table (Section 12: Handled cleanly with column auto-wrap)
        if not records:
            empty_p = Paragraph(
                "<b>No verified institutional records match the selected parameters.</b><br/>"
                "<font size='8' color='#64748b'>Please verify filter parameters or ensure peer-review approvals are committed.</font>",
                ParagraphStyle('Empty', fontName='Helvetica', fontSize=10, leading=14, textColor=colors.HexColor('#b91c1c'), alignment=1)
            )
            elements.append(empty_p)
        else:
            table_data = [[
                Paragraph("#", th_style),
                Paragraph("Faculty & ID", th_style),
                Paragraph("Department", th_style),
                Paragraph("Activity / Certification Title", th_style),
                Paragraph("Category", th_style),
                Paragraph("Date / Duration", th_style),
                Paragraph("Organizer / Venue", th_style),
                Paragraph("Status", th_style),
            ]]

            for r in records:
                table_data.append([
                    Paragraph(str(r['sl_no']), tb_style),
                    Paragraph(f"<b>{r['faculty_name']}</b><br/><font size='7' color='#64748b'>{r['employee_id'] or r['designation']}</font>", tb_style),
                    Paragraph(r['department_code'] or r['department_name'], tb_style),
                    Paragraph(f"<b>{r['activity_title']}</b>", tb_style),
                    Paragraph(r['category_name'], tb_style),
                    Paragraph(f"{r['date_range']}<br/><font size='7' color='#64748b'>{r['duration']}</font>", tb_style),
                    Paragraph(r['organizer'], tb_style),
                    Paragraph("VERIFIED", ParagraphStyle('V', fontName='Helvetica-Bold', fontSize=7, textColor=colors.HexColor('#047857'))),
                ])

            data_table = Table(
                table_data,
                colWidths=[25, 110, 65, 230, 80, 110, 100, 40],
                repeatRows=1
            )
            data_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ]))
            elements.append(data_table)

        canvas_maker = NumberedCanvas()
        doc.build(elements, canvasmaker=canvas_maker)
        buffer.seek(0)
        return buffer.getvalue()


# ==============================================================================
# 3. EXCEL REPORT GENERATOR (OpenPyXL with Auto-Fit & Freeze Panes)
# ==============================================================================

class ExcelReportGenerator:
    """
    Generates structured, professional Excel workbooks via OpenPyXL (Section 13).
    """

    @classmethod
    def generate(cls, report_data):
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Verified Institutional Report"

        # Styles
        title_font = Font(name="Calibri", size=14, bold=True, color="1E1B4B")
        sub_font = Font(name="Calibri", size=10, italic=True, color="475569")
        meta_label_font = Font(name="Calibri", size=9, bold=True, color="475569")
        meta_val_font = Font(name="Calibri", size=9, bold=True, color="0F172A")
        header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        data_font = Font(name="Calibri", size=9, color="0F172A")
        bold_data_font = Font(name="Calibri", size=9, bold=True, color="0F172A")

        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        alt_row_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        meta_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

        thin_border = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )

        # 1. Title Banner
        ws['A1'] = report_data['college']['name'].upper()
        ws['A1'].font = title_font
        ws['A2'] = report_data['meta']['title']
        ws['A2'].font = Font(name="Calibri", size=11, bold=True, color="334155")
        ws['A3'] = f"Generated by {report_data['meta']['generated_by']} on {report_data['meta']['generated_at']}"
        ws['A3'].font = sub_font

        # 2. Metadata Box (Row 4-5)
        ws['A5'] = "Academic Cycle:"
        ws['B5'] = report_data['meta']['academic_year']
        ws['C5'] = "Department:"
        ws['D5'] = report_data['meta']['department']
        ws['E5'] = "Total Verified Records:"
        ws['F5'] = report_data['meta']['total_records']
        for col_letter in ['A', 'C', 'E']:
            ws[f'{col_letter}5'].font = meta_label_font
            ws[f'{col_letter}5'].fill = meta_fill
        for col_letter in ['B', 'D', 'F']:
            ws[f'{col_letter}5'].font = meta_val_font
            ws[f'{col_letter}5'].fill = meta_fill

        # 3. Table Headers (Row 7)
        headers = [
            "S.No", "Faculty Name", "Employee ID", "Designation",
            "Department", "Activity Title", "Category", "Activity Type",
            "Start Date", "End Date", "Duration", "Organizer", "Venue", "Online", "Status"
        ]
        start_row = 7
        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=start_row, column=col_idx, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        # 4. Data Rows
        records = report_data['records']
        for r_idx, r in enumerate(records, start_row + 1):
            row_data = [
                r['sl_no'],
                r['faculty_name'],
                r['employee_id'],
                r['designation'],
                r['department_name'],
                r['activity_title'],
                r['category_name'],
                r['activity_type'],
                r['start_date'],
                r['end_date'],
                r['duration'],
                r['organizer'],
                r['venue'],
                r['is_online'],
                r['verified_status'],
            ]
            use_alt = (r_idx % 2 == 0)
            for c_idx, val in enumerate(row_data, 1):
                cell = ws.cell(row=r_idx, column=c_idx, value=val)
                cell.font = bold_data_font if c_idx in [1, 2, 6] else data_font
                cell.border = thin_border
                cell.alignment = Alignment(vertical="center")
                if use_alt:
                    cell.fill = alt_row_fill

        # 5. Enable Auto-Filters & Freeze Panes (Section 13)
        last_col = get_column_letter(len(headers))
        last_row = max(start_row + len(records), start_row + 1)
        ws.auto_filter.ref = f"A{start_row}:{last_col}{last_row}"
        ws.freeze_panes = f"A{start_row + 1}"

        # 6. Auto-fit column widths
        for col in ws.columns:
            col_letter = get_column_letter(col[0].column)
            max_len = 0
            for cell in col:
                if cell.row < start_row:
                    continue
                if cell.value:
                    max_len = max(max_len, len(str(cell.value)))
            ws.column_dimensions[col_letter].width = max(max_len + 3, 11)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()


# ==============================================================================
# 4. WORD REPORT GENERATOR (python-docx with Placeholder & Loop Populator)
# ==============================================================================

class WordReportGenerator:
    """
    Generates professional Word (.docx) reports supporting customizable templates
    with placeholder substitution (Section 8, 9, 14).
    """

    @classmethod
    def generate(cls, report_data, template_file=None):
        import docx
        from docx import Document
        from docx.shared import Inches, Pt, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.enum.table import WD_TABLE_ALIGNMENT

        if template_file and hasattr(template_file, 'path') and os.path.exists(template_file.path):
            doc = Document(template_file.path)
            cls._populate_existing_template(doc, report_data)
        else:
            doc = cls._build_standard_document(report_data)

        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    def _build_standard_document(cls, report_data):
        from docx import Document
        from docx.shared import Inches, Pt, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.enum.table import WD_TABLE_ALIGNMENT

        doc = Document()

        # Document margins
        for section in doc.sections:
            section.top_margin = Inches(0.7)
            section.bottom_margin = Inches(0.7)
            section.left_margin = Inches(0.7)
            section.right_margin = Inches(0.7)

        college_name = report_data['college']['name']
        report_title = report_data['meta']['title']

        # Header Title
        p_inst = doc.add_paragraph()
        r_inst = p_inst.add_run(college_name.upper())
        r_inst.font.name = 'Arial'
        r_inst.font.size = Pt(14)
        r_inst.font.bold = True
        r_inst.font.color.rgb = RGBColor(67, 56, 202)  # Brand indigo

        p_sub = doc.add_paragraph()
        r_sub = p_sub.add_run("Internal Quality Assurance Cell (IQAC) — Institutional Quality Report")
        r_sub.font.name = 'Arial'
        r_sub.font.size = Pt(9)
        r_sub.font.color.rgb = RGBColor(100, 116, 139)

        p_title = doc.add_paragraph()
        r_title = p_title.add_run(report_title)
        r_title.font.name = 'Arial'
        r_title.font.size = Pt(12)
        r_title.font.bold = True
        r_title.font.color.rgb = RGBColor(15, 23, 42)

        # Metadata Callout Box (Table)
        meta_table = doc.add_table(rows=2, cols=3)
        meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        meta_data = [
            [f"Academic Year: {report_data['meta']['academic_year']}", f"Department: {report_data['meta']['department']}", f"Verified Records: {report_data['meta']['total_records']}"],
            [f"Report Type: {report_data['meta']['report_type_name']}", f"Generated: {report_data['meta']['generated_date']}", "Status: Official Verified Data"]
        ]
        for r_idx, row in enumerate(meta_table.rows):
            for c_idx, cell in enumerate(row.cells):
                cell.text = meta_data[r_idx][c_idx]
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    for run in p.runs:
                        run.font.name = 'Arial'
                        run.font.size = Pt(8.5)
                        run.font.color.rgb = RGBColor(71, 85, 105)

        doc.add_paragraph()  # Spacer

        # Data Table
        records = report_data['records']
        if not records:
            p_empty = doc.add_paragraph("No verified institutional records match the selected parameters.")
            p_empty.runs[0].font.bold = True
            p_empty.runs[0].font.color.rgb = RGBColor(185, 28, 28)
        else:
            table = doc.add_table(rows=1, cols=7)
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            headers = ["#", "Faculty", "Department", "Activity Title", "Category", "Dates & Duration", "Organizer"]
            hdr_cells = table.rows[0].cells
            for idx, h_text in enumerate(headers):
                hdr_cells[idx].text = h_text
                for p in hdr_cells[idx].paragraphs:
                    for run in p.runs:
                        run.font.name = 'Arial'
                        run.font.size = Pt(8.5)
                        run.font.bold = True
                        run.font.color.rgb = RGBColor(255, 255, 255)

            # Style header row
            for cell in hdr_cells:
                cls._set_cell_background(cell, "1E293B")

            for r in records:
                row_cells = table.add_row().cells
                row_cells[0].text = str(r['sl_no'])
                row_cells[1].text = f"{r['faculty_name']}\n{r['employee_id'] or ''}".strip()
                row_cells[2].text = r['department_code'] or r['department_name']
                row_cells[3].text = r['activity_title']
                row_cells[4].text = r['category_name']
                row_cells[5].text = f"{r['date_range']}\n({r['duration']})".strip()
                row_cells[6].text = r['organizer']

                for cell in row_cells:
                    for p in cell.paragraphs:
                        for run in p.runs:
                            run.font.name = 'Arial'
                            run.font.size = Pt(8)

        # Footer
        footer = doc.sections[0].footer
        p_ft = footer.paragraphs[0]
        p_ft.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_ft = p_ft.add_run(f"Confidential — {college_name} IQAC Management System")
        r_ft.font.size = Pt(7.5)
        r_ft.font.color.rgb = RGBColor(148, 163, 184)

        return doc

    @classmethod
    def _populate_existing_template(cls, doc, report_data):
        """
        Substitutes placeholders and expands repeatable rows in an existing custom .docx template (Section 8).
        """
        replacements = {
            '{{college_name}}': report_data['college']['name'],
            '{{report_title}}': report_data['meta']['title'],
            '{{academic_year}}': report_data['meta']['academic_year'],
            '{{department_name}}': report_data['meta']['department'],
            '{{generated_by}}': report_data['meta']['generated_by'],
            '{{generated_date}}': report_data['meta']['generated_date'],
            '{{total_records}}': str(report_data['meta']['total_records']),
        }

        # 1. Replace in paragraphs
        for p in doc.paragraphs:
            for key, val in replacements.items():
                if key in p.text:
                    p.text = p.text.replace(key, val)

        # 2. Replace in tables and expand repeatable section
        records = report_data['records']
        for table in doc.tables:
            # Check if table contains template placeholders
            for row in list(table.rows):
                row_text = "".join(cell.text for cell in row.cells)
                for key, val in replacements.items():
                    if key in row_text:
                        for cell in row.cells:
                            if key in cell.text:
                                cell.text = cell.text.replace(key, val)

                # Repeatable row concept: {{#activities}} or {{activity_title}}
                if '{{activity_title}}' in row_text or '{{#activities}}' in row_text:
                    # Duplicate this row for each record
                    for rec in records:
                        new_row = table.add_row()
                        for c_idx, old_cell in enumerate(row.cells):
                            cell_template = old_cell.text
                            cell_val = cell_template
                            cell_val = cell_val.replace('{{#activities}}', '').replace('{{/activities}}', '')
                            cell_val = cell_val.replace('{{sl_no}}', str(rec['sl_no']))
                            cell_val = cell_val.replace('{{faculty_name}}', rec['faculty_name'])
                            cell_val = cell_val.replace('{{employee_id}}', rec['employee_id'])
                            cell_val = cell_val.replace('{{activity_title}}', rec['activity_title'])
                            cell_val = cell_val.replace('{{activity_category}}', rec['category_name'])
                            cell_val = cell_val.replace('{{start_date}}', rec['start_date'])
                            cell_val = cell_val.replace('{{end_date}}', rec['end_date'])
                            cell_val = cell_val.replace('{{date}}', rec['date_range'])
                            cell_val = cell_val.replace('{{duration}}', rec['duration'])
                            cell_val = cell_val.replace('{{organizer}}', rec['organizer'])
                            cell_val = cell_val.replace('{{department_name}}', rec['department_name'])
                            new_row.cells[c_idx].text = cell_val.strip()

    @staticmethod
    def _set_cell_background(cell, hex_color):
        from docx.oxml import parse_xml
        from docx.oxml.ns import nsdecls
        tcPr = cell._element.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        tcPr.append(shd)


# ==============================================================================
# 5. REPORT GENERATION COORDINATOR
# ==============================================================================

class ReportGenerationCoordinator:
    """
    Coordinates data fetching, format dispatching, file persistence, and audit logging.
    """

    @classmethod
    def generate_report(cls, user, report_type, filters, output_format=None, template=None):
        college = user.college if user.role != 'SUPER_ADMIN' else getattr(user, 'selected_college', user.college)
        fmt = output_format or (template.file_format if template else report_type.default_format)

        # 1. Collect and scope data
        report_data = ReportDataService.get_scoped_data(user, filters, report_type)

        # 2. Build filename
        dept_str = report_data['meta']['department'].replace(' ', '_')[:15]
        ay_str = report_data['meta']['academic_year'].replace(' ', '_')[:10]
        timestamp_str = timezone.now().strftime("%Y%m%d_%H%M%S")
        ext = 'pdf' if fmt == ReportFormat.PDF else ('xlsx' if fmt == ReportFormat.EXCEL else 'docx')
        filename = f"{report_type.code}_{dept_str}_{ay_str}_{timestamp_str}.{ext}"

        # 3. Create initial GeneratedReport record in DB
        serialized_filters = {}
        for k, v in (filters or {}).items():
            if v is not None:
                serialized_filters[k] = str(v) if hasattr(v, 'hex') else v

        rep_record = GeneratedReport.objects.create(
            college=college,
            report_type=report_type,
            template=template,
            template_version=template.version if template else 1,
            title=report_data['meta']['title'],
            academic_year_id=filters.get('academic_year'),
            department_id=filters.get('department') or (user.department_id if user.role in ['HOD', 'DEPARTMENT_INCHARGE'] else None),
            faculty_id=filters.get('faculty') or (user.id if user.role == 'FACULTY' else None),
            category_id=filters.get('category'),
            criterion_id=filters.get('criterion'),
            metric_id=filters.get('metric'),
            filters_applied=serialized_filters,
            record_count=report_data['meta']['total_records'],
            output_format=fmt,
            status=ReportStatus.GENERATING,
            generated_by=user,
        )

        try:
            # 4. Dispatch to renderer
            if fmt == ReportFormat.PDF:
                file_bytes = PDFReportGenerator.generate(report_data)
            elif fmt == ReportFormat.EXCEL:
                file_bytes = ExcelReportGenerator.generate(report_data)
            elif fmt == ReportFormat.WORD:
                tpl_file = template.file if template and template.file else None
                file_bytes = WordReportGenerator.generate(report_data, template_file=tpl_file)
            else:
                raise ValidationError(f"Unsupported output format: {fmt}")

            # 5. Persist file and mark COMPLETED
            rep_record.file.save(filename, ContentFile(file_bytes), save=False)
            rep_record.file_size = len(file_bytes)
            rep_record.status = ReportStatus.COMPLETED
            rep_record.save()

            # 6. Audit Logging (Section 35)
            log_action(
                actor=user,
                action='REPORT_GENERATED',
                instance=rep_record,
                comment=f"Generated {fmt} report '{rep_record.title}' with {rep_record.record_count} verified records."
            )

            return rep_record

        except Exception as exc:
            rep_record.status = ReportStatus.FAILED
            rep_record.error_message = str(exc)
            rep_record.save()

            log_action(
                actor=user,
                action='REPORT_FAILED',
                instance=rep_record,
                comment=f"Failed to generate report: {str(exc)}"
            )
            raise exc
