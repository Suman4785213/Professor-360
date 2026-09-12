"""
File Security & Upload Validators (Phase 12)
Provides rigorous validation for uploaded certificates, dossiers, and evidence files.
- Inspects magic bytes (file signatures) to defeat MIME spoofing
- Sanitizes filenames against directory traversal and null-byte injection
- Enforces strict whitelist of extensions and rejects executable file formats
- Enforces strict file size boundaries
"""
import os
import re
from typing import Tuple
from rest_framework.exceptions import ValidationError

# Known magic byte signatures
MAGIC_SIGNATURES = {
    'pdf': [b'%PDF-'],
    'png': [b'\x89PNG\r\n\x1a\n'],
    'jpg': [b'\xff\xd8\xff'],
    'jpeg': [b'\xff\xd8\xff'],
}

# Dangerous extensions that must never be uploaded or executed
DANGEROUS_EXTENSIONS = {
    '.exe', '.dll', '.so', '.sh', '.bat', '.cmd', '.py', '.php',
    '.phtml', '.php3', '.php4', '.php5', '.phps', '.jsp', '.asp',
    '.aspx', '.cgi', '.pl', '.js', '.vbs', '.ps1', '.html', '.htm',
    '.xhtml', '.svg', '.xml', '.jar', '.war', '.scr', '.msi'
}

# Whitelisted safe extensions
ALLOWED_EXTENSIONS = {
    '.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx'
}

MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024   # 10 MB
MAX_DOCUMENT_SIZE = 25 * 1024 * 1024      # 25 MB


def sanitize_filename(filename: str) -> str:
    """
    Strips directory traversal sequences, null bytes, and hazardous characters.
    Returns a safe base filename.
    """
    if not filename:
        return 'unnamed_upload'

    # Remove null bytes
    clean = filename.replace('\x00', '')

    # Strip directory paths (both forward and backward slashes)
    clean = os.path.basename(clean)
    clean = re.sub(r'[\r\n\t]', '', clean)

    # Prevent directory traversal patterns
    while '..' in clean:
        clean = clean.replace('..', '')

    # Keep only safe alphanumeric characters, dashes, underscores, and dots
    clean = re.sub(r'[^a-zA-Z0-9_\.\-]', '_', clean)

    # Avoid hidden files starting with dot
    clean = clean.lstrip('.')
    return clean or 'unnamed_upload'


def validate_file_security(uploaded_file, max_size: int = MAX_DOCUMENT_SIZE, allowed_types: Tuple[str, ...] = None) -> str:
    """
    Comprehensive upload security audit:
    1. Size constraint
    2. Filename traversal & injection
    3. Extension blacklist & whitelist
    4. Magic byte signature verification
    Returns the sanitized safe filename.
    """
    if not uploaded_file:
        raise ValidationError("No file was uploaded.")

    # 1. Size constraint
    if uploaded_file.size > max_size:
        max_mb = max_size // (1024 * 1024)
        raise ValidationError(f"File size exceeds the maximum limit of {max_mb} MB.")

    if uploaded_file.size == 0:
        raise ValidationError("Uploaded file is empty (0 bytes).")

    # 2. Filename inspection
    original_name = getattr(uploaded_file, 'name', '')
    if any(seq in original_name for seq in ('../', '..\\', '\x00', '/../', '\\..\\')):
        raise ValidationError("Invalid filename: Directory traversal detected.")

    sanitized = sanitize_filename(original_name)
    ext = os.path.splitext(sanitized)[1].lower()

    if not ext:
        raise ValidationError("File must have a valid extension (.pdf, .png, .jpg, .jpeg).")

    # 3. Extension blacklist & whitelist
    if ext in DANGEROUS_EXTENSIONS:
        raise ValidationError(f"Upload blocked: Executable or script file type '{ext}' is prohibited.")

    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(f"Unsupported file format '{ext}'. Allowed formats: PDF, PNG, JPG, JPEG.")

    # 4. Magic bytes verification
    clean_ext = ext.lstrip('.')
    if clean_ext in MAGIC_SIGNATURES:
        expected_magics = MAGIC_SIGNATURES[clean_ext]
        try:
            # Read first 16 bytes
            header = uploaded_file.read(16)
            uploaded_file.seek(0)  # Always rewind pointer

            matches = any(header.startswith(sig) for sig in expected_magics)
            if not matches:
                raise ValidationError(
                    f"File header mismatch: File claims to be '{ext}' but does not match genuine {clean_ext.upper()} magic bytes."
                )
        except Exception as e:
            if isinstance(e, ValidationError):
                raise
            uploaded_file.seek(0)
            raise ValidationError("Unable to verify file signature integrity.")

    return sanitized
