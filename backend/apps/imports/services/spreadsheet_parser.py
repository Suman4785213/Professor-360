"""
Spreadsheet Parser Service (Phase 14)
Securely parses .xlsx and .csv files with magic byte inspection, encoding detection,
formula injection defense, and sheet introspection.
"""
import io
import csv
import logging
from typing import Dict, Any, List, Optional
import openpyxl

logger = logging.getLogger(__name__)

MAX_IMPORT_FILE_SIZE = 25 * 1024 * 1024  # 25 MB
MAX_ROW_LIMIT = 50000

# Formula injection prefixes
FORMULA_PREFIXES = ('=', '+', '-', '@', '\t', '\r')


def sanitize_cell_value(val: Any) -> Any:
    """
    Sanitize potential formula injection from spreadsheet cells.
    If string begins with =, +, -, @, strip or neutralize it.
    """
    if val is None:
        return ""
    if isinstance(val, str):
        val_str = val.strip()
        if val_str.startswith(FORMULA_PREFIXES):
            # Prepend single quote or strip formula trigger
            return val_str.lstrip('=+@- \t\r')
        return val_str
    return val


class SpreadsheetParser:
    """
    Parser for Excel (.xlsx) and CSV (.csv) spreadsheets.
    """

    @classmethod
    def validate_file(cls, file_obj) -> str:
        """
        Validates file size and inspects magic bytes.
        Returns format: 'XLSX' or 'CSV'.
        Raises ValueError if invalid.
        """
        file_obj.seek(0, io.SEEK_END)
        size = file_obj.tell()
        file_obj.seek(0)

        if size > MAX_IMPORT_FILE_SIZE:
            raise ValueError(f"File size ({size / (1024*1024):.1f} MB) exceeds maximum allowed limit of 25 MB.")

        header = file_obj.read(512)
        file_obj.seek(0)

        # Inspect magic bytes
        if header.startswith(b'PK\x03\x04'):
            return 'XLSX'

        # Check if plain text / CSV
        try:
            # Try decoding as utf-8 or latin-1
            header.decode('utf-8-sig')
            return 'CSV'
        except UnicodeDecodeError:
            try:
                header.decode('latin-1')
                return 'CSV'
            except Exception:
                raise ValueError("Unsupported or corrupted spreadsheet format. Only valid .xlsx and .csv files are supported.")

    @classmethod
    def get_sheet_names(cls, file_obj, file_format: str) -> List[str]:
        """
        Returns list of worksheet names for Excel files, or ['Sheet1'] for CSV.
        """
        if file_format == 'CSV':
            return ['Sheet1']
        
        file_obj.seek(0)
        try:
            wb = openpyxl.load_workbook(file_obj, read_only=True, data_only=True)
            names = wb.sheetnames
            wb.close()
            return names
        except Exception as e:
            logger.error(f"Failed to read sheet names from workbook: {e}")
            raise ValueError(f"Unable to read Excel workbook: {str(e)}")

    @classmethod
    def parse(
        cls,
        file_obj,
        file_format: Optional[str] = None,
        sheet_name: Optional[str] = None,
        max_rows: int = MAX_ROW_LIMIT,
    ) -> Dict[str, Any]:
        """
        Parses spreadsheet into headers and sanitized dictionary rows.
        Returns:
            {
                'format': 'XLSX' | 'CSV',
                'sheet_names': [...],
                'active_sheet': str,
                'headers': [col1, col2, ...],
                'rows': [ {col1: val, col2: val, ...}, ... ],
                'total_rows': int,
            }
        """
        if not file_format:
            file_format = cls.validate_file(file_obj)

        if file_format == 'XLSX':
            return cls._parse_xlsx(file_obj, sheet_name=sheet_name, max_rows=max_rows)
        else:
            return cls._parse_csv(file_obj, max_rows=max_rows)

    @classmethod
    def _parse_xlsx(cls, file_obj, sheet_name: Optional[str] = None, max_rows: int = MAX_ROW_LIMIT) -> Dict[str, Any]:
        file_obj.seek(0)
        wb = openpyxl.load_workbook(file_obj, read_only=True, data_only=True)
        sheet_names = wb.sheetnames

        active_name = sheet_name if sheet_name and sheet_name in sheet_names else sheet_names[0]
        ws = wb[active_name]

        rows_iter = ws.iter_rows(values_only=True)
        headers = []
        raw_rows = []

        # Find first non-empty row as header
        for row in rows_iter:
            if not row or all(v is None or str(v).strip() == '' for v in row):
                continue
            headers = [str(cell).strip() if cell is not None else f"Column_{idx+1}" for idx, cell in enumerate(row)]
            break

        if not headers:
            wb.close()
            raise ValueError("Spreadsheet contains no header row or data.")

        # Read data rows
        row_count = 0
        for row in rows_iter:
            if not row or all(v is None or str(v).strip() == '' for v in row):
                continue
            row_dict = {}
            for idx, h in enumerate(headers):
                cell_val = row[idx] if idx < len(row) else ""
                row_dict[h] = sanitize_cell_value(cell_val)
            raw_rows.append(row_dict)
            row_count += 1
            if row_count >= max_rows:
                break

        wb.close()
        return {
            'format': 'XLSX',
            'sheet_names': sheet_names,
            'active_sheet': active_name,
            'headers': headers,
            'rows': raw_rows,
            'total_rows': len(raw_rows),
        }

    @classmethod
    def _parse_csv(cls, file_obj, max_rows: int = MAX_ROW_LIMIT) -> Dict[str, Any]:
        file_obj.seek(0)
        content_bytes = file_obj.read()

        # Detect encoding
        encoding = 'utf-8-sig'
        try:
            content = content_bytes.decode(encoding)
        except UnicodeDecodeError:
            encoding = 'latin-1'
            content = content_bytes.decode(encoding)

        reader = csv.reader(io.StringIO(content))
        headers = []
        raw_rows = []

        for row in reader:
            if not row or all(c.strip() == '' for c in row):
                continue
            headers = [c.strip() for c in row]
            break

        if not headers:
            raise ValueError("CSV contains no header row or data.")

        row_count = 0
        for row in reader:
            if not row or all(c.strip() == '' for c in row):
                continue
            row_dict = {}
            for idx, h in enumerate(headers):
                cell_val = row[idx] if idx < len(row) else ""
                row_dict[h] = sanitize_cell_value(cell_val)
            raw_rows.append(row_dict)
            row_count += 1
            if row_count >= max_rows:
                break

        return {
            'format': 'CSV',
            'sheet_names': ['Sheet1'],
            'active_sheet': 'Sheet1',
            'headers': headers,
            'rows': raw_rows,
            'total_rows': len(raw_rows),
        }
