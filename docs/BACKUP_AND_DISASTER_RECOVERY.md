# IQAC SaaS Platform — Backup, Rollback & Disaster Recovery Runbook

## 1. Backup Architecture & Retention Policy

Institutional accreditation compliance requires zero loss of verified faculty records, evidence dossiers, and AQAR/SSR snapshots.

| Asset Type | Storage Mechanism | Backup Frequency | Retention Policy | Integrity Check |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL DB** | Compressed dump (`.sql.gz` / `.json.gz`) | Daily automated (02:00 UTC) | 30 daily, 12 monthly | SHA-256 manifest check |
| **Evidence Media** | S3 / Local Block Volume (`/media`) | Real-time S3 replication | Indefinite for verified docs | SHA-256 file hash in DB |
| **Manifests** | JSON metadata file per snapshot | Generated with backup | Lifetime of backup file | Record count validation |

---

## 2. Backup Execution Procedures

### Automated Cron Job
In Linux/production environments, backups are scheduled via crontab:
```bash
0 2 * * * cd /opt/iqac && ./scripts/backup.sh 30 >> /var/log/iqac/cron_backup.log 2>&1
```

### Manual Backup
To create an on-demand snapshot prior to maintenance or release:
```bash
python manage.py backup_db --output-dir=/var/backups/iqac/db --retention-days=30
```

Sample output:
```
Backup created successfully:
  File: /var/backups/iqac/db/iqac_db_backup_20260911_103446.json.gz (82897 bytes)
  SHA-256: 5b050d9441da9db2aac66bb74734356f1bfea1e92d11c49877cfeb543eeaf6fc
  Manifest: /var/backups/iqac/db/iqac_db_backup_20260911_103446.manifest.json
  Method: dumpdata
```

---

## 3. Backup Verification & Integrity Auditing

Before restoring any archive, its cryptographic hash is checked against the companion manifest:

```bash
python manage.py restore_db --file=/var/backups/iqac/db/iqac_db_backup_20260911_103446.json.gz --verify-only
```

Expected Output:
```
Auditing backup file: /var/backups/iqac/db/iqac_db_backup_20260911_103446.json.gz
Manifest verified: Checksum matches (5b050d9441da9db2...)
Verification completed successfully. File is ready for restoration.
```
*If a single byte of the backup is corrupted or tampered with, execution aborts with `CRITICAL CHECKSUM MISMATCH`.*

---

## 4. Disaster Recovery Scenarios

### Scenario A: PostgreSQL Database Corruption / Server Failure
1. Put platform into maintenance mode:
   ```bash
   export MAINTENANCE_MODE=True
   ```
2. Identify the latest authenticated backup and verify integrity:
   ```bash
   python manage.py restore_db --file=/var/backups/iqac/db/latest.sql.gz --verify-only
   ```
3. Apply restoration:
   ```bash
   python manage.py restore_db --file=/var/backups/iqac/db/latest.sql.gz --apply
   ```
4. Confirm post-restore record counts (Colleges, Users, Activities, Documents).
5. Disable maintenance mode:
   ```bash
   export MAINTENANCE_MODE=False
   ```

### Scenario B: Evidence Storage Failure (Lost `/media` Volume)
1. Re-provision disk or attach fresh persistent block volume.
2. Synchronize files from S3 backup bucket:
   ```bash
   aws s3 sync s3://${S3_BACKUP_BUCKET}/media/ /app/media/ --sse AES256
   ```
3. Run verification check on document SHA-256 hashes:
   ```bash
   python manage.py check_document_integrity
   ```

### Scenario C: Application Server Outage
1. Pull the latest tested Docker images:
   ```bash
   docker compose pull
   ```
2. Start containers:
   ```bash
   docker compose up -d
   ```
3. Query `/health/` to confirm database connectivity and worker status.

### Scenario D: AI Provider (OpenAI) Outage or API Depletion
- The IQAC architecture employs **Graceful Degradation**.
- When OpenAI is down, timed out, or returns a 5xx error, `OpenAIProvider` automatically falls back to `HeuristicAIProvider`.
- Faculty submissions are never blocked; certificates are extracted using regular expressions, and manual review workflows remain 100% operational.

---

## 5. Safe Rollback Strategy

When a newly deployed version encounters unexpected issues in production:

### 1. Application Rollback
- Revert Docker container to previous image tag:
  ```bash
  docker compose down
  docker compose up -d --no-build <previous_image_tag>
  ```

### 2. Database Migration Rollback Considerations
- **Never blindly run `migrate <app> <previous_migration>` in production!**
- Review if the rollback removes existing columns that contain newly entered institutional data.
- If backward-compatible migrations were applied (additive column/table additions), code can be rolled back without reverting DB schema.
- If breaking migration occurred, restore the pre-migration snapshot taken in Section 2.

### 3. Configuration Rollback
- Maintain version-controlled `.env.production` backups (without sensitive passwords in git, stored in secure secret manager like AWS Secrets Manager or HashiCorp Vault).
