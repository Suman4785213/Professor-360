"""
Database Backup Management Command (Phase 12)
Usage:
    python manage.py backup_db [--output-dir=/path] [--retention-days=30]
Generates compressed, checksummed database snapshots with validation manifests.
"""
import os
import sys
import gzip
import json
import shutil
import hashlib
import subprocess
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import connection


class Command(BaseCommand):
    help = "Generates a compressed, checksummed PostgreSQL backup with manifest verification."

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            default=os.path.join(settings.BASE_DIR, 'backups', 'db'),
            help='Directory where backup files and manifests will be stored.'
        )
        parser.add_argument(
            '--retention-days',
            type=int,
            default=30,
            help='Number of days to retain backups before automatic pruning.'
        )

    def handle(self, *args, **options):
        output_dir = options['output_dir']
        retention_days = options['retention_days']
        os.makedirs(output_dir, exist_ok=True)

        db_settings = settings.DATABASES['default']
        db_name = db_settings.get('NAME', 'iqac_db')
        db_user = db_settings.get('USER', 'postgres')
        db_host = db_settings.get('HOST', 'localhost')
        db_port = str(db_settings.get('PORT', '5432'))
        db_pass = db_settings.get('PASSWORD', '')

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_base = f"iqac_db_backup_{timestamp}"
        backup_path = os.path.join(output_dir, f"{backup_base}.sql.gz")
        manifest_path = os.path.join(output_dir, f"{backup_base}.manifest.json")

        self.stdout.write(self.style.NOTICE(f"Starting database backup for '{db_name}'..."))

        # Check for pg_dump
        pg_dump_bin = shutil.which('pg_dump')
        backup_method = 'pg_dump'

        if pg_dump_bin:
            env = os.environ.copy()
            if db_pass:
                env['PGPASSWORD'] = db_pass

            dump_cmd = [
                pg_dump_bin,
                '-h', db_host,
                '-p', db_port,
                '-U', db_user,
                '-d', db_name,
                '--no-owner',
                '--no-privileges',
            ]

            try:
                proc = subprocess.Popen(dump_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
                with gzip.open(backup_path, 'wb') as gz_out:
                    shutil.copyfileobj(proc.stdout, gz_out)
                proc.wait()

                if proc.returncode != 0:
                    err_msg = proc.stderr.read().decode('utf-8', errors='ignore')
                    self.stdout.write(self.style.WARNING(f"pg_dump failed ({err_msg}). Falling back to Django dumpdata..."))
                    backup_method = 'dumpdata'
                    if os.path.exists(backup_path):
                        os.remove(backup_path)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"pg_dump invocation failed ({e}). Falling back to Django dumpdata..."))
                backup_method = 'dumpdata'
        else:
            self.stdout.write(self.style.WARNING("pg_dump binary not found in PATH. Using Django dumpdata fallback."))
            backup_method = 'dumpdata'

        if backup_method == 'dumpdata':
            backup_path = os.path.join(output_dir, f"{backup_base}.json.gz")
            from django.core.management import call_command
            import io
            json_buffer = io.StringIO()
            call_command('dumpdata', natural_foreign=True, natural_primary=True, stdout=json_buffer)
            with gzip.open(backup_path, 'wt', encoding='utf-8') as gz_out:
                gz_out.write(json_buffer.getvalue())

        # Compute SHA-256 Checksum
        sha256 = hashlib.sha256()
        with open(backup_path, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                sha256.update(chunk)
        checksum = sha256.hexdigest()
        file_size = os.path.getsize(backup_path)

        # Inspect key table record counts
        table_counts = {}
        tables_to_check = [
            'colleges_college',
            'accounts_user',
            'departments_department',
            'activities_activity',
            'activities_document',
            'verification_verificationrecord',
            'reports_reportgenerationjob',
        ]
        with connection.cursor() as cursor:
            for tbl in tables_to_check:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {tbl};")
                    table_counts[tbl] = cursor.fetchone()[0]
                except Exception:
                    pass

        manifest = {
            'backup_file': os.path.basename(backup_path),
            'timestamp': datetime.now().isoformat(),
            'database': db_name,
            'method': backup_method,
            'size_bytes': file_size,
            'sha256': checksum,
            'table_record_counts': table_counts,
            'iqac_version': '1.0.0',
        }

        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2)

        self.stdout.write(self.style.SUCCESS(
            f"Backup created successfully:\n"
            f"  File: {backup_path} ({file_size} bytes)\n"
            f"  SHA-256: {checksum}\n"
            f"  Manifest: {manifest_path}\n"
            f"  Method: {backup_method}"
        ))

        # Retention Cleanup
        self._cleanup_old_backups(output_dir, retention_days)

    def _cleanup_old_backups(self, output_dir: str, retention_days: int):
        cutoff = datetime.now() - timedelta(days=retention_days)
        pruned_count = 0

        for fname in os.listdir(output_dir):
            if fname.startswith("iqac_db_backup_") and (fname.endswith(".gz") or fname.endswith(".json")):
                fpath = os.path.join(output_dir, fname)
                mtime = datetime.fromtimestamp(os.path.getmtime(fpath))
                if mtime < cutoff:
                    try:
                        os.remove(fpath)
                        pruned_count += 1
                    except Exception:
                        pass

        if pruned_count > 0:
            self.stdout.write(self.style.NOTICE(f"Pruned {pruned_count} backup files older than {retention_days} days."))
