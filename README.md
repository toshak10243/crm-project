# CRM Lead Management System

A full-featured, enterprise-grade multi-tenant Lead Management CRM designed for modern businesses to streamline sales pipelines, lead conversions, team collaboration, automated communication, and performance auditing.

---

## Overview

This CRM empowers organizations to:
- Capture and centralize leads from diverse channels (Website, WhatsApp, IndiaMART, Meta Ads, Manual entry).
- Track leads dynamically across custom color-coded sales pipelines.
- Auto-assign incoming leads to sales agents and branch teams.
- Manage follow-ups, pending interactions, and automated birthday reminders.
- Conduct integrated cloud telephony (IVR Incoming & Outgoing call logging with durations).
- Run WhatsApp automation campaigns via WA Daddy (Contacts, Campaigns, Meta-style Templates, Real-time Chat inbox).
- Audit sales productivity via detailed Work Reports (KPI cards, 7-day velocity charts, channel distributions, and 1-click HTML/PDF kacha-chitta reports).
- Dynamically customize form fields, statuses, message templates, branches, and lead sources without changing any code.

---

## Architecture & Hierarchy

```
Super Admin (Platform Owner)
    └── Admin (Tenant / Business Owner)
            └── Managers & Agents (Branch Sales Team)
```

- **Super Admin**: Provisions tenant companies upon manual onboarding or plan approval, manages audit logs, system health, revenue analytics, and global background jobs.
- **Admin**: Configures custom statuses, WhatsApp/Email templates, custom form fields, branches, and monitors team performance.
- **Users / Agents**: Operates leads daily, logs calls, records follow-up remarks, and closes deals.

Each company enjoys complete database-level multi-tenancy: **one isolated PostgreSQL database per tenant**.

---

## Tech Stack

| Component | Technology | Description |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Ultra-fast client-side bundle |
| Styling | Tailwind CSS v3 | Clean enterprise UI with responsive design |
| State Management | Zustand | Lightweight, persistent client stores |
| Data Fetching | Axios + TanStack Query v5 | Cached, optimistic, and reliable API communications |
| Forms & Validation | React Hook Form + Zod | Strict runtime schema validation |
| Realtime | Socket.io Client | Instant notifications and chat synchronization |
| Backend Framework | NestJS + TypeScript | Modular, scalable enterprise architecture |
| Database Engine | PostgreSQL (pg driver) | High-performance raw SQL queries with parameterization |
| Caching & Queues | Redis + BullMQ | Background job orchestration and token cache |
| Authentication | JWT (HMAC SHA-256) | 15-min rotating access tokens + 30-day refresh sessions |
| Reporting & Export | Puppeteer & HTML-based Print Engine | Clean vector PDF generation for work reports |

---

## Repository Structure

```
crm-project/
├── backend/
│   ├── src/
│   │   ├── database/          # DatabaseModule with dynamic tenant pool resolution
│   │   ├── modules/
│   │   │   ├── auth/          # Unified multi-tenant login & token rotation
│   │   │   ├── branches/      # Branch master management
│   │   │   ├── form-fields/   # Dynamic custom field builder
│   │   │   ├── ivr/           # Telephony call logging & duration analytics
│   │   │   ├── leads/         # Lead lifecycle, pipeline scoring & auto-assignment
│   │   │   ├── settings/      # Statuses, email/WhatsApp templates & sources
│   │   │   ├── super-admin/   # Multi-tenant management & platform control
│   │   │   ├── users/         # Team & RBAC administration
│   │   │   ├── wadaddy/       # WhatsApp automation, campaigns & chatbox
│   │   │   └── work-report/   # Daily sales auditing & performance reports
│   │   ├── scripts/           # Migration & tenant seeding utilities
│   │   └── sql/tenant/        # Idempotent raw SQL migration scripts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Layout, modals, header actions, breadcrumbs
│   │   ├── pages/
│   │   │   ├── auth/          # Unified Login & Password Management
│   │   │   ├── dashboard/     # Executive Dashboard & analytics
│   │   │   ├── finance/       # IVR logs & WA Daddy WhatsApp suite
│   │   │   ├── leads/         # Add Lead, All Leads, Followups, Today Birthday
│   │   │   ├── masters/       # Branch & Form Field dynamic master tables
│   │   │   ├── reports/       # Work Reports & audit kacha-chitta with PDF export
│   │   │   ├── settings/      # Lead Statuses, WhatsApp/Email templates, Lead Sources
│   │   │   ├── super-admin/   # Super admin cockpit, tenant provisioning, audit logs
│   │   │   └── users/         # Admin Users & Master Admin profiles
│   │   ├── store/             # Auth & Session state
│   │   └── router/            # Protected client-side routing
│   └── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** v20.x or higher
- **pnpm** v9.x or higher (`npm install -g pnpm`)
- **PostgreSQL** v15.x or higher (Running on port `5432`)
- **Redis** v7.x or higher (Running on port `6379`)

---

### Database Setup

1. Verify that your PostgreSQL service is running on port `5432`.
2. Create the master platform database:
```sql
CREATE DATABASE crm_master;
```
*(Tenant databases like `crm_tenant_{slug}` are provisioned automatically when companies are onboarded or migrated).*

---

### Backend Configuration

1. Open your terminal and navigate to the backend directory:
```bash
cd backend
```

2. Install all dependencies:
```bash
pnpm install
```

3. Setup your environment variables by copying `.env.example`:
```bash
cp .env.example .env
```
*(On Windows Command Prompt: `copy .env.example .env`)*

4. Run the master platform migrations:
```bash
pnpm run migrate
```

5. Seed the default Super Admin user:
```bash
pnpm run seed:super-admin
```

6. Launch the development server:
```bash
pnpm run start:dev
```
Backend will be listening on: `http://localhost:3001` (API: `http://localhost:3001/api`)

---

### Frontend Configuration

1. Open another terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install all frontend dependencies:
```bash
pnpm install
```

3. Create the environment file:
```bash
cp .env.example .env
```

4. Start the Vite development server:
```bash
pnpm run dev
```
Frontend will be running on: `http://localhost:5173`

---

## Environment Variables Reference

### Backend `.env`

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Master Database
MASTER_DB_HOST=localhost
MASTER_DB_PORT=5432
MASTER_DB_NAME=crm_master
MASTER_DB_USER=postgres
MASTER_DB_PASSWORD=your_postgres_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security & JWT Tokens
JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_characters
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_characters
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# Initial Super Admin
SUPER_ADMIN_EMAIL=superadmin@yourcrm.com
SUPER_ADMIN_PASSWORD=SuperSecurePassword@123

# SMTP Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# File Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

---

## Core Modules & Implemented Features

### 1. Lead Management Engine
- **Add Lead**: Rich intake form featuring dynamic phone prefixes, auto-populated country codes, dynamic branches, dynamic lead sources, and custom user-defined form fields.
- **Pipeline & Follow-ups**: Real-time filtering by status, search keyword, date, branch, and sales agent. Includes specialized views for *Today Followup*, *All Followup*, and *Today Birthday*.
- **Auto Lead Assignment**: Integrated toggle to round-robin or auto-assign fresh leads across available sales executives.

### 2. Settings & Dynamic Customizations
- **Lead Statuses**: Add, edit, or delete statuses with custom labels and native color picker integration.
- **WhatsApp Message Templates**: Reusable pre-approved templates for automated outreach.
- **Email Templates**: HTML-ready notification and follow-up templates.
- **Lead From (Sources)**: Dynamic lead origins (e.g. Website, Toshak Sharma, IndiaMART, Walk-in).

### 3. WA Daddy (WhatsApp Suite)
- **Contacts**: Contact list management with bulk import and instant segmentation.
- **Campaigns**: Broadcast campaigns with delivery, read, and failure tracking.
- **Templates**: Pre-designed Meta-style cards and interactive promotional message layouts.
- **Live Chatbox**: Threaded real-time messaging interface with full message history and contact context.

### 4. Work Report & Audit Trail
- **Summary Metrics**: Real-time count of Total Leads, Deals Won (Win Rate %), Active Pipeline, Total Talk Time (minutes logged from IVR), and Overdue Follow-ups.
- **Graphical Analytics**: 7-day lead velocity bar chart, source channel distribution bars, and status distribution breakdown.
- **Detailed Kacha-Chitta**: Comprehensive agent-by-agent activity table detailing lead status, remarks, talk times, and conversion outcomes.
- **Exporting**: 1-click professional print and HTML-based PDF export.

### 5. Multi-Tenant Database Architecture
- Raw SQL parameterization prevents injection attacks while maintaining peak query speeds.
- Complete data isolation ensures Tenant A can never read or access Tenant B records.
- Tenant database routing is determined dynamically via decoded JWT claims without manual connection overhead.

---

## Build & Production Deployment

### Backend
```bash
cd backend
pnpm run build
pnpm run start:prod
```

### Frontend
```bash
cd frontend
pnpm run build
pnpm run preview
```

---

## Developer Guidelines

- **No ORM**: All database interactions use clean raw SQL with parameterized values (`$1`, `$2`, etc.) via `pg` connection pools.
- **Security Protocols**: Access tokens expire after 15 minutes and automatically rotate via silent refresh. After 30 days of inactivity, users are gracefully logged out with an enterprise notification modal.
- **Clean Code**: Strict TypeScript typing across both frontend (`crm.types.ts`) and backend DTOs.
- **Theme**: Clean, high-contrast, professional enterprise UI.

---

## License

Private and proprietary. Developed for authorized enterprise use only.
