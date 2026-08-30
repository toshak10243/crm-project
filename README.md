# CRM Lead Management System

A full-featured Lead Management CRM built for businesses to manage their leads, clients, quotations, and sales pipeline. This is a production-grade CRM system — not a demo project.

---

## What is this?

This CRM helps businesses:
- Capture leads from multiple sources (website, WhatsApp, IndiaMART, Meta Ads, etc.)
- Track leads through a sales pipeline
- Auto-assign leads to sales agents
- Manage follow-ups, tasks, and communications
- Create and send quotations
- Convert leads to clients
- Handle invoices and payments
- Run automated workflows
- Get reports and analytics

---

## Who uses this?

```
Super Admin (Us — the CRM owner)
    └── Admin (Our client — the business owner)
            └── Users/Agents (Admin ki team)
```

- **Super Admin** — Manually creates company accounts when payment is received. No payment gateway needed.
- **Admin** — Gets login credentials, manages their own team and leads.
- **Users/Agents** — Work under Admin, handle leads daily.

Each company gets their **own separate database** — complete data isolation.

---

## Tech Stack

| Part | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS v3 |
| State Management | Zustand |
| API Calls | TanStack Query (React Query v5) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Realtime | Socket.io |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL (raw SQL — no ORM) |
| Cache & Queue | Redis + BullMQ |
| Auth | JWT (Access + Refresh tokens) |
| File Storage | Local disk (Phase 1) |
| Email | Nodemailer (SMTP) |
| PDF | Puppeteer |

---

## Project Structure

```
crm-project/
├── backend/          # NestJS API server
├── frontend/         # React web app
└── README.md         # This file
```

---

## Prerequisites

Make sure you have these installed before running the project:

- **Node.js** v20 or higher — https://nodejs.org
- **pnpm** — `npm install -g pnpm`
- **PostgreSQL** v15 or higher — https://www.postgresql.org/download
- **Redis** v7 or higher — https://redis.io/download (Windows: use Redis via WSL or Docker)
- **Git** — https://git-scm.com

---

## Database Setup

### Step 1 — Start PostgreSQL

Make sure PostgreSQL is running on your machine on port `5432`.

### Step 2 — Create Master Database

Open pgAdmin or psql and run:

```sql
CREATE DATABASE crm_master;
```

This is the only database you create manually. All client databases are created automatically by the system.

### Step 3 — Redis

Make sure Redis is running on port `6379`.

---

## Backend Setup

```bash
# Go to backend folder
cd backend

# Install dependencies
pnpm install

# Create environment file
copy .env.example .env
# (Edit .env with your database credentials)

# Run SQL migrations (creates tables in crm_master)
pnpm run migrate

# Create first Super Admin account
pnpm run seed:super-admin

# Start development server
pnpm run start:dev
```

Backend will run on: `http://localhost:3001`

---

## Frontend Setup

```bash
# Go to frontend folder
cd frontend

# Install dependencies
pnpm install

# Create environment file
copy .env.example .env

# Start development server
pnpm run dev
```

Frontend will run on: `http://localhost:5173`

---

## Environment Variables

### Backend `.env`

```env
# App
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Master Database (crm_master)
MASTER_DB_HOST=localhost
MASTER_DB_PORT=5432
MASTER_DB_NAME=crm_master
MASTER_DB_USER=postgres
MASTER_DB_PASSWORD=your_postgres_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets (change these in production — use long random strings)
JWT_ACCESS_SECRET=your-access-secret-min-32-characters-long
JWT_REFRESH_SECRET=your-refresh-secret-min-32-characters-long
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# First Super Admin Account
SUPER_ADMIN_EMAIL=superadmin@yourcrm.com
SUPER_ADMIN_PASSWORD=SuperSecurePassword@123

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password

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

## How it Works — Database Architecture

```
crm_master (1 database)
    ├── companies table       → list of all client companies
    ├── super_admins table    → our super admin accounts
    └── super_admin_tokens    → refresh tokens

crm_client_abc_corp (per company)
    ├── users
    ├── leads
    ├── clients
    ├── quotations
    ├── deals
    ├── tasks
    ├── activities
    ├── invoices
    ├── payments
    ├── workflows
    ├── notifications
    ├── audit_logs
    └── ... (30+ tables)
```

When Super Admin creates a new company:
1. Entry added in `crm_master.companies`
2. New database `crm_client_{slug}` is created automatically
3. All tables are provisioned automatically
4. Admin user is created with a temporary password
5. Email sent to Admin with login credentials

---

## API Structure

```
http://localhost:3001/api/

# Super Admin routes (only Super Admin can access)
/super-admin/auth/login
/super-admin/companies
/super-admin/companies/:id/activate
/super-admin/companies/:id/deactivate

# Client Auth routes
/auth/login
/auth/refresh
/auth/logout
/auth/change-password

# Main CRM routes (JWT protected)
/leads
/clients
/quotations
/deals
/tasks
/activities
/users
/reports
/settings
...
```

---

## Build Phases

This project is built in phases — one module at a time:

| Phase | What we build | Status |
|---|---|---|
| Phase 1 | Auth, Super Admin, Company provisioning, User management | 🔄 In Progress |
| Phase 2 | Lead management, Pipeline, Scoring, Auto assignment | ⏳ Pending |
| Phase 3 | Follow-ups, Tasks, Communications, Notifications | ⏳ Pending |
| Phase 4 | Quotations, Deals, Documents | ⏳ Pending |
| Phase 5 | Clients 360°, Finance, Invoices | ⏳ Pending |
| Phase 6 | Automation Engine, AI Assistant | ⏳ Pending |
| Phase 7 | Reports, Masters, Settings | ⏳ Pending |
| Phase 8 | Security (2FA, IP restriction), Polish | ⏳ Pending |

---

## Key Features

### Dynamic Forms
Admin can add custom fields to Lead/Client forms from the settings panel. No code change needed — fully dynamic.

### Role-Based Access Control
Granular permissions — module level, sub-module level, action level (View, Add, Edit, Delete, Export, Import, Approve).

### Multi-tenant Architecture
Every company has its own database. One company's data never touches another's.

### Automation Engine
Admin can set up workflows — e.g., "When a lead score goes above 80, auto-assign to senior agent and send WhatsApp message."

### Real-time Notifications
In-app notifications via Socket.io. Also supports Email, WhatsApp, SMS notifications.

---

## Scripts

### Backend

```bash
pnpm run start:dev      # Start in development (auto-reload)
pnpm run start:prod     # Start in production
pnpm run build          # Build for production
pnpm run migrate        # Run SQL migrations
pnpm run seed:super-admin  # Create first super admin
pnpm run test           # Run unit tests
```

### Frontend

```bash
pnpm run dev            # Start development server
pnpm run build          # Build for production
pnpm run preview        # Preview production build
```

---

## Common Issues

**PostgreSQL connection error**
- Check if PostgreSQL is running
- Check `.env` credentials match your PostgreSQL setup

**Redis connection error**
- Check if Redis is running on port 6379
- On Windows, use WSL or Docker for Redis

**pnpm not found**
```bash
npm install -g pnpm
```

**Port already in use**
- Backend default: 3001 — change `PORT` in `.env`
- Frontend default: 5173 — runs automatically on next available port

---

## Notes for Developers

- Sab SQL queries raw likhi hain — koi ORM nahi (`$1`, `$2` parameterized queries use karo)
- Har client ka data alag database mein hai — JWT token mein `dbName` hota hai
- Comments Hinglish mein hain — English + Hindi mix
- Super Admin aur Client Auth bilkul alag hain
- Koi payment gateway nahi — Super Admin manually activate karta hai

---

## License

Private — Internal use only. Not open source.
