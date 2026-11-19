"""
Evidence app services — Search, Statistics, and Export Services
"""
import io
import csv
import zipfile
import re
from datetime import datetime
from django.db.models import Q, Count
from django.http import HttpResponse
from django.utils import timezone
from apps.activities.models import ActivityStatus
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter


class EvidenceSearchService:
    """
    Service for parsing natural search queries and building structured Django ORM filters.
    Designed with a clean abstraction layer so LLM / semantic query parsing can be plugged in later.
    """
    @staticmethod
    def build_search_query(search_text: str) -> Q:
        """
        Parses search string into multi-attribute Q filter.
        Handles quoted phrases and partial token matching.
        """
        if not search_text or not search_text.strip():
            return Q()

        query = search_text.strip()
        q_filter = (
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(category__icontains=query) |
            Q(faculty__first_name__icontains=query) |
            Q(faculty__last_name__icontains=query) |
            Q(faculty__employee_id__icontains=query) |
            Q(faculty__email__icontains=query) |
            Q(department__name__icontains=query) |
            Q(department__code__icontains=query) |
            Q(academic_year__name__icontains=query) |
            Q(activity__organizer__icontains=query) |
            Q(activity__certificate_number__icontains=query) |
            Q(document__file_name__icontains=query) |
            Q(document__original_filename__icontains=query)
        )

        return q_filter

    @staticmethod
    def apply_smart_filters(queryset, params):
        """
        Applies combined filters: academic_year, department, category, faculty,
        status, date_from, date_to, organizer, and natural search.
        """
        academic_year_id = params.get('academic_year')
        if academic_year_id:
            queryset = queryset.filter(academic_year_id=academic_year_id)

        department_id = params.get('department')
        if department_id:
            queryset = queryset.filter(department_id=department_id)

        category = params.get('category')
        if category and category != 'ALL':
            queryset = queryset.filter(
                Q(category__iexact=category) |
                Q(activity__category__code__iexact=category) |
                Q(activity__activity_type__iexact=category)
            )

        faculty_id = params.get('faculty')
        if faculty_id:
            queryset = queryset.filter(faculty_id=faculty_id)

        organizer = params.get('organizer')
        if organizer:
            queryset = queryset.filter(activity__organizer__icontains=organizer.strip())

        date_from = params.get('date_from')
        if date_from:
            queryset = queryset.filter(activity__start_date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            queryset = queryset.filter(activity__end_date__lte=date_to)

        status = params.get('status')
        if status and status != 'ALL':
            if status in ['ACTIVE', 'ARCHIVED']:
                queryset = queryset.filter(status=status)
            else:
                queryset = queryset.filter(activity__status=status)

        search_query = params.get('search')
        if search_query:
            queryset = queryset.filter(EvidenceSearchService.build_search_query(search_query))

        return queryset


class EvidenceStatsService:
    """
    Computes real-time repository statistics from the database.
    """
    @staticmethod
    def get_repository_stats(college, user):
        from .models import Evidence
        from apps.activities.models import Activity
        from apps.academic_years.models import AcademicYear

        # Scope base queries
        ev_qs = Evidence.objects.filter(college=college)
        act_qs = Activity.objects.filter(college=college)

        if user.role == 'FACULTY':
            ev_qs = ev_qs.filter(faculty=user)
            act_qs = act_qs.filter(faculty=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            ev_qs = ev_qs.filter(department=user.department) if user.department_id else ev_qs.none()
            act_qs = act_qs.filter(department=user.department) if user.department_id else act_qs.none()

        # Active academic year
        current_ay = AcademicYear.objects.filter(college=college, is_current=True).first()

        total_verified = ev_qs.filter(status='ACTIVE', is_verified=True).count()
        current_year_verified = ev_qs.filter(status='ACTIVE', academic_year=current_ay).count() if current_ay else 0
        total_archived = ev_qs.filter(status='ARCHIVED').count()

        pending_count = act_qs.filter(
            status__in=[
                ActivityStatus.PENDING_INCHARGE,
                ActivityStatus.PENDING_HOD,
                ActivityStatus.PENDING_IQAC
            ]
        ).count()

        # Department breakdown
        dept_breakdown = list(
            ev_qs.filter(status='ACTIVE')
            .values('department__id', 'department__name', 'department__code')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Category breakdown
        cat_breakdown = list(
            ev_qs.filter(status='ACTIVE')
            .values('category')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Academic year breakdown
        ay_breakdown = list(
            ev_qs.filter(status='ACTIVE')
            .values('academic_year__id', 'academic_year__name')
            .annotate(count=Count('id'))
            .order_by('academic_year__name')
        )

        return {
            'total_verified': total_verified,
            'current_year_verified': current_year_verified,
            'pending_verification': pending_count,
            'total_archived': total_archived,
            'current_academic_year': current_ay.name if current_ay else 'None',
            'department_breakdown': [
                {
                    'id': str(d['department__id']),
                    'name': d['department__name'],
                    'code': d['department__code'],
                    'count': d['count']
                } for d in dept_breakdown if d['department__id']
            ],
            'category_breakdown': [
                {
                    'category': c['category'] or 'Uncategorized',
                    'count': c['count']
                } for c in cat_breakdown
            ],
            'academic_year_breakdown': [
                {
                    'id': str(y['academic_year__id']),
                    'name': y['academic_year__name'],
                    'count': y['count']
                } for y in ay_breakdown if y['academic_year__id']
            ]
        }


class EvidenceExportService:
    """
    Exports filtered evidence records to CSV, Excel, or bulk ZIP archive.
    """
    @staticmethod
    def generate_csv(queryset):
        output = io.StringIO()
        writer = csv.writer(output)

        headers = [
            'Sl. No',
            'Activity Title',
            'Faculty Name',
            'Employee ID',
            'Department',
            'Category',
            'Academic Year',
            'Start Date',
            'End Date',
            'Duration',
            'Organizer',
            'Location',
            'Certificate No',
            'Primary Document',
            'Checksum (SHA-256)',
            'Verification Status',
            'Verified At',
        ]
        writer.writerow(headers)

        for idx, ev in enumerate(queryset, 1):
            act = ev.activity
            doc = ev.document
            writer.writerow([
                idx,
                ev.title,
                ev.faculty.get_full_name(),
                getattr(ev.faculty, 'employee_id', '') or '',
                ev.department.name if ev.department else '',
                ev.category,
                ev.academic_year.name if ev.academic_year else '',
                act.start_date.isoformat() if act and act.start_date else '',
                act.end_date.isoformat() if act and act.end_date else '',
                act.duration if act else '',
                act.organizer if act else '',
                act.location if act else '',
                act.certificate_number if act else '',
                doc.file_name if doc else 'No Document',
                doc.file_hash if doc and doc.file_hash else '',
                'VERIFIED' if ev.is_verified else 'PENDING',
                ev.verified_at.strftime('%Y-%m-%d %H:%M') if ev.verified_at else '',
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
        filename = f"IQAC_Evidence_Export_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @staticmethod
    def generate_excel(queryset):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Verified Evidence"

        # Theme styling
        header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='1E293B', end_color='1E293B', fill_type='solid') # Slate-900
        border_thin = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        align_center = Alignment(horizontal='center', vertical='center')
        align_left = Alignment(horizontal='left', vertical='center')

        headers = [
            'Sl. No',
            'Activity Title',
            'Faculty Name',
            'Employee ID',
            'Department',
            'Category',
            'Academic Year',
            'Start Date',
            'End Date',
            'Duration',
            'Organizer',
            'Location',
            'Certificate No',
            'Primary Document',
            'Checksum (SHA-256)',
            'Verified At',
        ]

        # Write title banner
        ws.merge_cells('A1:P1')
        title_cell = ws['A1']
        title_cell.value = "CENTRAL QUALITY ASSURANCE CELL — DIGITAL EVIDENCE REPOSITORY"
        title_cell.font = Font(name='Calibri', size=13, bold=True, color='1E3A8A')
        title_cell.alignment = align_center

        ws.append([]) # Row 2 blank

        # Write headers
        ws.append(headers) # Row 3
        header_row = ws[3]
        for col_idx, cell in enumerate(header_row, 1):
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = align_center
            cell.border = border_thin

        # Write data rows
        for idx, ev in enumerate(queryset, 1):
            act = ev.activity
            doc = ev.document
            row = [
                idx,
                ev.title,
                ev.faculty.get_full_name(),
                getattr(ev.faculty, 'employee_id', '') or '',
                ev.department.name if ev.department else '',
                ev.category,
                ev.academic_year.name if ev.academic_year else '',
                act.start_date.isoformat() if act and act.start_date else '',
                act.end_date.isoformat() if act and act.end_date else '',
                act.duration if act else '',
                act.organizer if act else '',
                act.location if act else '',
                act.certificate_number if act else '',
                doc.file_name if doc else 'No Document',
                doc.file_hash[:16] + '...' if doc and doc.file_hash else '',
                ev.verified_at.strftime('%Y-%m-%d %H:%M') if ev.verified_at else '',
            ]
            ws.append(row)
            current_row = ws[ws.max_row]
            for c in current_row:
                c.border = border_thin
                c.alignment = align_left

        # Adjust column widths
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                if cell.row > 1 and cell.value:
                    max_len = max(max_len, len(str(cell.value)))
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 40)

        out_buffer = io.BytesIO()
        wb.save(out_buffer)
        out_buffer.seek(0)

        response = HttpResponse(
            out_buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f"IQAC_Evidence_Dossier_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @staticmethod
    def generate_zip(queryset):
        """
        Creates an in-memory ZIP archive of supporting documents for selected evidence records.
        """
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            added_filenames = set()

            for ev in queryset:
                # Include all documents attached to this activity
                docs = ev.activity.documents.filter(status='ACTIVE') if ev.activity else []
                dept_code = ev.department.code if ev.department else 'GEN'
                faculty_name = re.sub(r'[^\w\-_\. ]', '_', ev.faculty.get_full_name())

                for d in docs:
                    if not d.file:
                        continue
                    try:
                        clean_title = re.sub(r'[^\w\-_\. ]', '_', ev.title[:30])
                        orig_name = d.original_filename or d.file_name or 'document.pdf'
                        archive_path = f"{dept_code}/{faculty_name}/{clean_title}/{orig_name}"

                        # Prevent name collision in zip
                        counter = 1
                        unique_path = archive_path
                        while unique_path in added_filenames:
                            name_part, ext = (orig_name.rsplit('.', 1) + [''])[:2]
                            unique_path = f"{dept_code}/{faculty_name}/{clean_title}/{name_part}_{counter}.{ext}"
                            counter += 1

                        added_filenames.add(unique_path)
                        zf.writestr(unique_path, d.file.read())
                    except Exception as e:
                        print(f"Error archiving document {d.id}: {e}")

        zip_buffer.seek(0)
        response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
        filename = f"IQAC_Evidence_Files_{timezone.now().strftime('%Y%m%d_%H%M%S')}.zip"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
