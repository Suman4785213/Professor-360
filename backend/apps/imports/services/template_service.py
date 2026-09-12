"""
Template Service (Phase 14)
Generates downloadable Excel (.xlsx) and CSV (.csv) import templates
with styling, required headers, and representative sample data.
"""
import io
import csv
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from typing import Tuple, Dict, Any, List

from apps.imports.models import ImportDataType

TEMPLATE_CONFIGS = {
    ImportDataType.FACULTY: {
        'headers': ['Employee ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Department', 'Designation', 'Qualification', 'Joining Date'],
        'fields': ['employee_id', 'first_name', 'last_name', 'email', 'phone', 'department', 'designation', 'qualification', 'joining_date'],
        'sample': [
            ['EMP101', 'Arun', 'Kumar', 'arun.kumar@college.edu', '9876543210', 'CSE', 'Assistant Professor', 'M.Tech, Ph.D', '2021-08-15'],
            ['EMP102', 'Priya', 'Sundaram', 'priya.s@college.edu', '9876543211', 'ECE', 'Associate Professor', 'Ph.D', '2019-06-10'],
        ],
        'description': 'Faculty Profile Import Template. Note: Email and Department are required.',
    },
    ImportDataType.ACTIVITIES: {
        'headers': ['Title', 'Faculty Email/ID', 'Department', 'Category', 'Academic Year', 'Organizer', 'Start Date', 'End Date', 'Certificate Number', 'Description'],
        'fields': ['title', 'faculty', 'department', 'category', 'academic_year', 'organizer', 'start_date', 'end_date', 'certificate_number', 'description'],
        'sample': [
            ['National Workshop on Deep Learning', 'arun.kumar@college.edu', 'CSE', 'Workshop', '2024-25', 'IIT Madras', '2024-09-10', '2024-09-12', 'IITM-DL-2024-88', '3-day hands-on workshop on PyTorch'],
            ['International Conference on VLSI', 'priya.s@college.edu', 'ECE', 'Conference', '2024-25', 'IEEE Bangalore', '2024-11-05', '2024-11-07', 'IEEE-VLSI-901', 'Presented research paper on low-power architectures'],
        ],
        'description': 'Activity Import Template. Imported records will be created in DRAFT status for verification.',
    },
    ImportDataType.EVIDENCE_METADATA: {
        'headers': ['Title', 'Faculty Email/ID', 'Department', 'Category', 'Academic Year', 'Organizer', 'Start Date', 'Certificate Number', 'Document Filename'],
        'fields': ['title', 'faculty', 'department', 'category', 'academic_year', 'organizer', 'start_date', 'certificate_number', 'document_filename'],
        'sample': [
            ['FDP on Cloud Computing', 'arun.kumar@college.edu', 'CSE', 'FDP', '2024-25', 'NPTEL-AICTE', '2024-08-01', 'NPTEL24CS881', 'EMP101_Cloud_FDP.pdf'],
        ],
        'description': 'Evidence Metadata Import Template. Matches activity metadata without requiring immediate physical file upload.',
    },
    ImportDataType.DEPARTMENTS: {
        'headers': ['Department Name', 'Department Code', 'Description'],
        'fields': ['name', 'code', 'description'],
        'sample': [
            ['Computer Science and Engineering', 'CSE', 'Department of Computer Science and Engineering'],
            ['Electronics and Communication Engineering', 'ECE', 'Department of Electronics and Communication Engineering'],
            ['Mechanical Engineering', 'MECH', 'Department of Mechanical Engineering'],
        ],
        'description': 'Departments Import Template. Department Code must be unique within your institution.',
    },
    ImportDataType.PROGRAMS: {
        'headers': ['Program Name', 'Program Code', 'Department', 'Degree', 'Duration Years'],
        'fields': ['name', 'code', 'department', 'degree', 'duration_years'],
        'sample': [
            ['B.Tech Information Technology', 'BTECH-IT', 'CSE', 'B.Tech', '4'],
            ['M.E. VLSI Design', 'ME-VLSI', 'ECE', 'M.E.', '2'],
        ],
        'description': 'Academic Programs Import Template.',
    },
    ImportDataType.ACADEMIC_YEARS: {
        'headers': ['Academic Year Name', 'Start Date', 'End Date'],
        'fields': ['name', 'start_date', 'end_date'],
        'sample': [
            ['2024-25', '2024-06-01', '2025-05-31'],
            ['2025-26', '2025-06-01', '2026-05-31'],
        ],
        'description': 'Academic Years Import Template.',
    },
}


class TemplateService:
    """
    Generates downloadable import templates in Excel (.xlsx) and CSV (.csv) formats.
    """

    @classmethod
    def generate_excel_template(cls, data_type: str) -> io.BytesIO:
        config = TEMPLATE_CONFIGS.get(data_type, TEMPLATE_CONFIGS[ImportDataType.FACULTY])
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"{data_type}_Template"

        # Styling
        header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='4F46E5', end_color='4F46E5', fill_type='solid')
        sample_fill = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')
        border_side = Side(style='thin', color='E2E8F0')
        border = Border(left=border_side, right=border_side, top=border_side, bottom=border_side)

        # Instruction row
        ws.append([f"IQAC Institutional Data Import Template — {config['description']}"])
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(config['headers']))
        ws.cell(row=1, column=1).font = Font(name='Calibri', size=10, italic=True, color='64748B')
        ws.row_dimensions[1].height = 24

        # Headers
        ws.append(config['headers'])
        header_row_idx = 2
        ws.row_dimensions[header_row_idx].height = 28

        for col_idx in range(1, len(config['headers']) + 1):
            cell = ws.cell(row=header_row_idx, column=col_idx)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = border

        # Sample rows
        for sample_row in config['sample']:
            ws.append(sample_row)
            curr_row = ws.max_row
            ws.row_dimensions[curr_row].height = 22
            for col_idx in range(1, len(sample_row) + 1):
                c = ws.cell(row=curr_row, column=col_idx)
                c.fill = sample_fill
                c.border = border
                c.alignment = Alignment(vertical='center')

        # Auto-fit columns
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 15)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer

    @classmethod
    def generate_csv_template(cls, data_type: str) -> io.StringIO:
        config = TEMPLATE_CONFIGS.get(data_type, TEMPLATE_CONFIGS[ImportDataType.FACULTY])
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(config['headers'])
        for row in config['sample']:
            writer.writerow(row)
        buffer.seek(0)
        return buffer
