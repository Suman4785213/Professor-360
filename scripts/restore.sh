#!/usr/bin/env bash
# ==============================================================================
# IQAC SaaS — Production Database Restore Script
# Usage: ./scripts/restore.sh <path_to_backup_file> [--apply]
# ==============================================================================
set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Error: Path to backup file is required."
    echo "Usage: $0 <path_to_backup_file> [--apply]"
    exit 1
fi

BACKUP_FILE="$1"
APPLY_FLAG="${2:-}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file '${BACKUP_FILE}' not found."
    exit 1
fi

echo "Auditing and verifying backup: ${BACKUP_FILE}"

if [ "${APPLY_FLAG}" == "--apply" ]; then
    read -p "WARNING: You are about to overwrite the database. Are you sure? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Restore aborted by user."
        exit 0
    fi
    python manage.py restore_db --file="${BACKUP_FILE}" --apply
else
    python manage.py restore_db --file="${BACKUP_FILE}" --verify-only
    echo "To restore this backup into the database, run:"
    echo "  $0 ${BACKUP_FILE} --apply"
fi
