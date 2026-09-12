#!/usr/bin/env bash
# ==============================================================================
# IQAC SaaS — Automated Production Database Backup Script
# Usage: ./scripts/backup.sh [retention_days]
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/iqac/db}"
RETENTION_DAYS="${1:-30}"
DATE_STAMP="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${BACKUP_DIR}/backup_${DATE_STAMP}.log"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting IQAC automated backup (retention: ${RETENTION_DAYS} days)..." | tee -a "${LOG_FILE}"

# Execute Django backup management command
python manage.py backup_db --output-dir="${BACKUP_DIR}" --retention-days="${RETENTION_DAYS}" 2>&1 | tee -a "${LOG_FILE}"

# Optional: Sync backup to S3-compatible remote storage if S3_BACKUP_BUCKET is set
if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Syncing backups to S3: s3://${S3_BACKUP_BUCKET}/db_backups/..." | tee -a "${LOG_FILE}"
    aws s3 sync "${BACKUP_DIR}" "s3://${S3_BACKUP_BUCKET}/db_backups/" --exclude "*.log" --sse AES256
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup workflow completed successfully." | tee -a "${LOG_FILE}"
