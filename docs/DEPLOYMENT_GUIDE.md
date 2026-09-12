# IQAC SaaS Platform — Production Deployment Guide

## 1. System Architecture & Topology

The IQAC SaaS Platform is built on a multi-tier, containerized architecture designed for institutional isolation, high availability, and horizontal scalability.

```
                  +--------------------------------+
                  | Internet / Institutional DNS  |
                  +--------------------------------+
                                  |
                                  v
                  +--------------------------------+
                  |  Nginx Edge / Reverse Proxy    |
                  |  - SSL/TLS Termination (HTTPS) |
                  |  - OWASP Security Headers      |
                  |  - Gzip Compression            |
                  |  - Request ID Injection        |
                  +---------------+----------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
+-----------------------+                   +-----------------------+
| Frontend Static SPA   |                   | Backend WSGI Service  |
| - React 19 + Vite     |                   | - Django 5.2 / Python |
| - Nginx Alpine        |                   | - Gunicorn (Workers)  |
| - Cached Assets       |                   | - REST Framework      |
+-----------------------+                   +-----------+-----------+
                                                        |
                      +---------------------------------+---------------------------------+
                      |                                 |                                 |
                      v                                 v                                 v
          +-----------------------+         +-----------------------+         +-----------------------+
          | PostgreSQL 16+ DB     |         | Redis 7+ Cache/Queue  |         | S3 / Media Storage    |
          | - Row-Level Isolation |         | - Rate Limiting       |         | - AES-256 Encryption  |
          | - Read/Write Pooling  |         | - Background Tasks    |         | - Presigned Downloads |
          | - Point-in-Time Dumps |         | - Session Throttles   |         | - Quota Tracking      |
          +-----------------------+         +-----------------------+         +-----------------------+
```

---

## 2. Server & Hardware Prerequisites

| Component | Minimum Specification | Recommended Production |
| :--- | :--- | :--- |
| **CPU** | 2 vCPU | 4+ vCPU |
| **RAM** | 4 GB | 8–16 GB |
| **Disk Storage** | 40 GB SSD (NVMe preferred) | 100+ GB SSD + Object Storage |
| **Operating System** | Ubuntu 22.04 LTS / Debian 12 | Ubuntu 24.04 LTS or Amazon Linux 2023 |
| **Docker Engine** | Docker 24.0+ & Compose v2.20+ | Docker 26.0+ |
| **Python** | Python 3.13 | Python 3.13 |
| **Node.js** | Node.js 22 LTS | Node.js 22 LTS |

---

## 3. Environment Configuration

1. Clone repository to server:
   ```bash
   git clone <repo_url> /opt/iqac
   cd /opt/iqac
   ```

2. Copy production environment template:
   ```bash
   cp backend/.env.production.example backend/.env.production
   ```

3. Configure mandatory environment parameters:
   - `SECRET_KEY`: Minimum 50 random alphanumeric characters.
     ```bash
     python3 -c 'import secrets; print(secrets.token_urlsafe(50))'
     ```
   - `ALLOWED_HOSTS`: Domain names (e.g., `iqac.yourdomain.edu,api.yourdomain.edu`).
   - `CORS_ALLOWED_ORIGINS`: Full frontend HTTPS origins (e.g., `https://iqac.yourdomain.edu`).
   - `DB_PASSWORD`: Strong 32+ character PostgreSQL password.
   - `OPENAI_API_KEY`: API key for automated certificate OCR and field extraction.

---

## 4. Docker Compose Deployment (Recommended)

1. Start all container services:
   ```bash
   docker compose --env-file backend/.env.production up -d --build
   ```

2. Verify container health status:
   ```bash
   docker compose ps
   ```
   *All containers (`iqac_postgres`, `iqac_redis`, `iqac_backend`, `iqac_web`) should report `healthy`.*

3. Execute database migrations inside the backend container:
   ```bash
   docker compose exec backend python manage.py migrate
   ```

4. Collect static assets:
   ```bash
   docker compose exec backend python manage.py collectstatic --no-input
   ```

5. (Optional) Populate seed colleges and administrative users:
   ```bash
   docker compose exec backend python manage.py seed_data
   ```

---

## 5. Manual / Bare-Metal Deployment

### Backend Service Setup (Systemd & Gunicorn)

1. Create python virtual environment:
   ```bash
   cd /opt/iqac/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements/production.txt
   ```

2. Create `/etc/systemd/system/iqac-backend.service`:
   ```ini
   [Unit]
   Description=IQAC SaaS Gunicorn Daemon
   After=network.target postgresql.service redis.service

   [Service]
   User=iqac
   Group=iqac
   WorkingDirectory=/opt/iqac/backend
   EnvironmentFile=/opt/iqac/backend/.env.production
   ExecStart=/opt/iqac/backend/venv/bin/gunicorn \
       --workers 4 \
       --threads 2 \
       --bind 127.0.0.1:8000 \
       --timeout 120 \
       --access-logfile /var/log/iqac/gunicorn.access.log \
       --error-logfile /var/log/iqac/gunicorn.error.log \
       config.wsgi:application

   Restart=always
   RestartSec=5s

   [Install]
   WantedBy=multi-user.target
   ```

3. Enable and start service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now iqac-backend
   ```

---

## 6. SSL/TLS Certificate Setup (Certbot & Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d iqac.yourdomain.edu -d api.yourdomain.edu
```

---

## 7. Health & Monitoring Probes

The application provides an unauthenticated, zero-credential-leak health check:
- URL: `GET /health/` or `GET /api/health/`
- Expected Output:
  ```json
  {
    "status": "HEALTHY",
    "version": "1.0.0",
    "environment": "production",
    "response_time_ms": 4.12,
    "checks": {
      "database": {"status": "HEALTHY", "latency_ms": 1.2},
      "cache": {"status": "HEALTHY", "latency_ms": 0.4},
      "storage": {"status": "HEALTHY", "latency_ms": 0.1},
      "background_workers": {"status": "HEALTHY"},
      "ai_service": {"status": "HEALTHY", "mode": "openai"}
    },
    "request_id": "REQ-7F4B2A1E8C9D"
  }
  ```
