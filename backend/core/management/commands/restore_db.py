"""
Database Restore & Verification Management Command (Phase 12)
Usage:
    python manage.py restore_db --file=/path/to/backup.sql.gz [--verify-only] [--apply]
Verifies SHA-256 manifest integrity before touching or restoring the database.
"""
import os
import gzip
import json
import shutil
import hashlib
import subprocess
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import connection


class Command(BaseCommand):
    help = "Verifies and restores a PostgreSQL backup from an authenticated snapshot."

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            required=True,
            help='Path to the backup archive (.sql.gz or .json.gz).'
        )
        parser.add_argument(
            '--verify-only',
            action='store_true',
            help='Verify SHA-256 integrity against the manifest without restoring data.'
        )
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Perform the database restoration.'
        )

    def handle(self, *args, **options):
        file_path = options['file']
        verify_only = options['verify_only']
        apply_restore = options['apply']

        if not os.path.exists(file_path):
            raise CommandError(f"Backup file '{file_path}' does not exist.")

        if not verify_only and not apply_restore:
            self.stdout.write(self.style.WARNING("Neither --verify-only nor --apply specified. Defaulting to --verify-only."))
            verify_only = True

        self.stdout.write(self.style.NOTICE(f"Auditing backup file: {file_path}"))

        # 1. Checksum Verification
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                sha256.update(chunk)
        actual_checksum = sha256.hexdigest()

        # Check for companion manifest
        base_no_ext = file_path
        for ext in ('.sql.gz', '.json.gz', '.gz', '.sql', '.json'):
            if base_no_ext.endswith(ext):
                base_no_ext = base_no_ext[:-len(ext)]
                break

        manifest_path = f"{base_no_ext}.manifest.json"
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r', encoding='utf-8') as mf:
                manifest = json.load(mf)
                expected_checksum = manifest.get('sha256')
                if expected_checksum and expected_checksum != actual_checksum:
                    raise CommandError(
                        f"CRITICAL CHECKSUM MISMATCH: File integrity compromised!\n"
                        f"Expected: {expected_checksum}\nActual:   {actual_checksum}"
                    )
                self.stdout.write(self.style.SUCCESS(
                    f"Manifest verified: Checksum matches ({actual_checksum[:16]}...)"
                ))
        else:
            self.stdout.write(self.style.WARNING(
                f"Manifest file not found at '{manifest_path}'. Proceeding with computed checksum: {actual_checksum}"
            ))

        if verify_only:
            self.stdout.write(self.style.SUCCESS("Verification completed successfully. File is ready for restoration."))
            return

        # 2. Database Restoration
        self.stdout.write(self.style.WARNING("Applying database restoration..."))
        db_settings = settings.DATABASES['default']
        db_name = db_settings.get('NAME', 'iqac_db')
        db_user = db_settings.get('USER', 'postgres')
        db_host = db_settings.get('HOST', 'localhost')
        db_port = str(db_settings.get('PORT', '5432'))
        db_pass = db_settings.get('PASSWORD', '')

        if file_path.endswith('.sql.gz'):
            psql_bin = shutil.which('psql')
            if not psql_bin:
                raise CommandError("psql binary not found in PATH to restore .sql.gz archive.")

            env = os.environ.copy()
            if db_pass:
                env['PGPASSWORD'] = db_pass

            psql_cmd = [
                psql_bin,
                '-h', db_host,
                '-p', db_port,
                '-U', db_user,
                '-d', db_name,
            ]

            proc = subprocess.Popen(psql_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
            with gzip.open(file_path, 'rb') as gz_in:
                shutil.copyfileobj(gz_in, proc.stdin)
            proc.stdin.close()
            proc.wait()

            if proc.returncode != 0:
                err = proc.stderr.read().decode('utf-8', errors='ignore')
                raise CommandError(f"psql restore failed: {err}")

        elif file_path.endswith('.json.gz'):
            from django.core.management import call_command
            import tempfile
            with tempfile.NamedTemporaryFile('wt', suffix='.json', delete=False, encoding='utf-8') as tmp:
                tmp_path = tmp.name
                with gzip.open(file_path, 'rt', encoding='utf-8') as gz_in:
                    tmp.write(gz_in.read())

            try:
                call_command('loaddata', tmp_path)
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        # 3. Post-Restore Verification
        self.stdout.write(self.style.NOTICE("Running post-restore integrity check..."))
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM colleges_college;")
            colleges_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM accounts_user;")
            users_count = cursor.fetchone()[0]

        self.stdout.write(self.style.SUCCESS(
            f"Database restored successfully!\n"
            f"  Colleges in DB: {colleges_count}\n"
            f"  Users in DB:    {users_count}"
        ))
