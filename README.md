# IQAC Management SaaS Platform

> **Core Product Principle**: *ENTER DATA ONCE → VERIFY ONCE → REUSE EVERYWHERE*

A centralized multi-tenant IQAC Management SaaS platform for higher education institutions to manage faculty profiles, activities, certifications, multi-level verification workflows, evidence repositories, and NAAC accreditation compliance.

---

## Tech Stack

- **Backend**: Python 3.13, Django 5.2, Django REST Framework, SimpleJWT
- **Database**: PostgreSQL 18 (`iqac_db` running on localhost:5432)
- **Frontend**: React 19, TypeScript, Tailwind CSS, React Router v7, Zustand, Lucide Icons, Recharts
- **Build & Dev Tool**: Vite 8

---

## Setup & Local Development

### 1. Database Configuration (PostgreSQL)

Ensure PostgreSQL 18 service is running on `localhost:5432`.
Create the database:
```sql
CREATE DATABASE iqac_db;
```

Configure `backend/.env`:
```env
DEBUG=True
SECRET_KEY=iqac-secret-key-change-in-production-2026-phase2
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

USE_SQLITE=False
DB_NAME=iqac_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 2. Backend Setup & Migrations

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows PowerShell/CMD
pip install -r requirements/base.txt

# Run migrations on PostgreSQL
python manage.py migrate

# Seed development demo data
python manage.py seed_data

# Start backend server
python manage.py runserver 0.0.0.0:8000
```
API available at: `http://localhost:8000/api/`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
Application UI available at: `http://localhost:5173/`

---

## Seed Demo Accounts & Roles

The database is pre-seeded with accounts for all 6 system roles:

| Role | Email | Password | Context |
|---|---|---|---|
| **SUPER_ADMIN** | `admin@iqac.local` | `admin123` | Platform-level tenant & user provisioning |
| **COLLEGE_MANAGEMENT** | `management@demo.edu` | `demo123` | Demo Engineering College (Oversight & Monitoring) |
| **IQAC** | `iqac@demo.edu` | `demo123` | Central Quality Assurance Cell |
| **HOD** | `hod.cse@demo.edu` | `demo123` | Computer Science and Engineering Dept |
| **DEPARTMENT_INCHARGE** | `incharge.cse@demo.edu` | `demo123` | Computer Science and Engineering Dept |
| **FACULTY** | `faculty.smith@demo.edu` | `demo123` | Computer Science and Engineering Dept |
| **FACULTY (IT)** | `faculty.doe@demo.edu` | `demo123` | Information Technology Dept |
| **FACULTY (Apex College)**| `faculty@apex.edu` | `demo123` | Apex Institute of Technology (Tenant Isolation Demo) |

---

## Architecture & Security Enforcement

### 1. The 6 Strict System Roles
1. `SUPER_ADMIN`
2. `COLLEGE_MANAGEMENT`
3. `IQAC`
4. `HOD`
5. `DEPARTMENT_INCHARGE`
6. `FACULTY`

*(Note: Auditor and Viewer roles are intentionally excluded per specification).*

### 2. Tenant Isolation
Every institutional entity inherits `TenantModel` or has a foreign key to `College`.
`TenantMixin` in DRF viewsets automatically scopes all queries to the authenticated user's `college`.
A user from College A cannot read, query, update, or access records belonging to College B via APIs, IDs, or query parameters.

### 3. Department Isolation
HOD and Department In-charge access is strictly scoped to their assigned `department`. Submissions or faculty from other departments are not accessible.

### 4. Faculty Isolation
Faculty members can only access their own profile, submissions, and certificates.

### 5. Frontend Role Routing & 403 Access Denied
Routes are segmented per role:
- `/admin/*`
- `/management/*`
- `/iqac/*`
- `/hod/*`
- `/incharge/*`
- `/faculty/*`

Unauthorized cross-role access triggers a **403 — Access Denied** screen with an explanation and redirect to the user's authorized dashboard.

---

## Running Automated Tests

```bash
cd backend
python manage.py test apps.accounts.tests_phase2
```
All 16 tests verify:
- Authentication & JWT token issuance/invalidation
- Password reset token verification
- Multi-tenant isolation
- Department & Faculty isolation
- User activation/deactivation
- Academic year single-active context
- Audit logging
