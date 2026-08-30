# CRM Lead Management System — Complete Research & Build Plan
**Hinglish mein — Phase-wise, Production-Grade**

---

## 1. System Overview — Kya Banana Hai?

Ek **SaaS-style CRM** banana hai lekin **Salesforce-style multi-tenant NAHI** hai.

### Model Kya Hai?
```
Super Admin (Hamara)
    └── Admin (Client — jise hum CRM dete hain)
            └── Users (Admin ke employees/agents)
```

- **Super Admin** = Sirf humara ek account. Woh manually ek Admin ka account banata hai jab payment receive ho.
- **Admin** = Ek company ka owner. Apna password change kar sakta hai. Apni team manage karta hai.
- **User/Agent** = Admin ke under kaam karne wale log. Leads handle karte hain.
- **Koi payment gateway nahi** — Super Admin manually activate karta hai.
- **Database Strategy** = Jab bhi ek nayi company (Admin) add ho, ek nayi dedicated PostgreSQL database ban jaati hai: `crm_client_{company_slug}`. Sab tenants ka data alag-alag DB mein.

### Kyun Alag Database Per Tenant?
- Data isolation — ek client ka data doosre ko kabhi nahi dikhega
- Easy backup/restore per client
- Future mein individual client DB ko scale karna easy
- Simple queries — no `org_id` filter lagana everywhere

---

## 2. Tech Stack — Final Decision

| Layer | Technology | Reason |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Vite | Fast, modern, type-safe |
| **UI Library** | shadcn/ui + Tailwind CSS v3 | MNC-level professional UI |
| **State** | Zustand | Simple global state |
| **Server State** | TanStack Query (React Query v5) | API caching + sync |
| **Forms** | React Hook Form + Zod | Validation + dynamic forms |
| **Charts** | Recharts | Dashboard analytics |
| **Realtime** | Socket.io-client | Notifications, live updates |
| **Backend** | NestJS + TypeScript | Modular, enterprise-grade |
| **Database** | PostgreSQL (raw SQL — NO Prisma, NO TypeORM ORM) | Manual table creation, full control |
| **DB Driver** | `pg` (node-postgres) + `pg-pool` | Direct SQL execution |
| **Cache/Queue** | Redis + BullMQ | Async jobs, sessions, rate limit |
| **Auth** | JWT (Access + Refresh tokens) | Stateless auth |
| **File Storage** | Local disk (Phase 1) → S3 compatible (Phase 2) | PDFs, documents |
| **Email** | Nodemailer (SMTP) | Free, configurable |
| **WhatsApp** | Meta Cloud API | Free tier available |
| **PDF Gen** | Puppeteer / html-pdf-node | Quotation PDF export |
| **Realtime** | Socket.io | Notifications |

### Database Decision — MANUAL SQL (No ORM)
```sql
-- Asa kuch nahi hoga:
-- @Entity(), @Column() — TypeORM wala

-- Ye hoga:
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  ...
);
```

**Super Admin DB** = `crm_master` — Yahan sirf companies aur admin accounts ka record.

**Per-Client DB** = `crm_client_{slug}` — Yahan leads, users, quotations, sab kuch.

---

## 3. Poora Module List — Flow Diagram Se

### Phase 1 — Foundation
- [ ] Auth System (Super Admin + Admin + User login)
- [ ] Super Admin Panel (Company management)
- [ ] Database provisioning (auto create DB on new client)

### Phase 2 — Lead Management Core
- [ ] Lead Capture (manual + webhook)
- [ ] Duplicate Check
- [ ] Lead Scoring (manual rules + AI based)
- [ ] Auto Assignment
- [ ] Lead Pipeline / Lifecycle

### Phase 3 — Communication & Tasks
- [ ] Follow-ups & Tasks
- [ ] Communication (WhatsApp, Email, SMS, Calls log)
- [ ] Notifications (In-app, Email, WhatsApp, SMS)

### Phase 4 — Deals & Quotations
- [ ] Quotations (Create, Send, Track, Convert to Deal)
- [ ] Deals / Opportunities
- [ ] Documents (Upload, Share, Preview)

### Phase 5 — Client Management
- [ ] Convert Lead → Client
- [ ] Client 360° View
- [ ] Finance (Invoices, Payments, GST)

### Phase 6 — Automation & AI
- [ ] Automation Engine (Workflow builder, triggers)
- [ ] AI Assistant (Lead scoring, Next best action, Suggestions)

### Phase 7 — Reports & Settings
- [ ] Reports & Analytics
- [ ] Masters (Dynamic form fields, templates)
- [ ] Settings (Company, notification, pipeline)

### Phase 8 — Admin Features
- [ ] User Management (RBAC)
- [ ] Permission Master
- [ ] IP Restriction
- [ ] Security Layer (2FA, session management)

---

## 4. Database Architecture — Detailed

### Master Database: `crm_master`
```sql
-- Companies table (Super Admin manage karta hai)
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,  -- db name mein use hoga
  admin_email   VARCHAR(255) UNIQUE NOT NULL,
  admin_name    VARCHAR(255) NOT NULL,
  db_name       VARCHAR(100) NOT NULL,         -- crm_client_{slug}
  is_active     BOOLEAN DEFAULT true,
  activated_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Super admin table
CREATE TABLE super_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh tokens for super admin
CREATE TABLE super_admin_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID REFERENCES super_admins(id) ON DELETE CASCADE,
  token_hash    VARCHAR(255) NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Per-Client Database: `crm_client_{slug}`

```sql
-- Users (Admin + Agents)
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(50) NOT NULL DEFAULT 'agent',
  -- role: 'admin' | 'manager' | 'agent'
  department_id   UUID,
  is_active       BOOLEAN DEFAULT true,
  avatar_url      VARCHAR(500),
  phone           VARCHAR(20),
  last_login_at   TIMESTAMPTZ,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Departments
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Roles & Permissions (Granular)
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module      VARCHAR(100) NOT NULL,   -- 'leads', 'quotations', etc.
  sub_module  VARCHAR(100),            -- 'all_leads', 'my_leads', etc.
  action      VARCHAR(50) NOT NULL,    -- 'view', 'add', 'edit', 'delete', 'export', 'import', 'approve'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role_permissions (
  role_id       UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Refresh tokens
CREATE TABLE user_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  ip_address  VARCHAR(50),
  user_agent  TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- IP Whitelist
CREATE TABLE ip_whitelist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address  VARCHAR(50) NOT NULL,
  label       VARCHAR(100),
  is_active   BOOLEAN DEFAULT true,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Sources (Dynamic — Admin configure karta hai)
CREATE TABLE lead_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Statuses (Dynamic)
CREATE TABLE lead_statuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(20) DEFAULT '#6b7280',
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT true
);

-- Pipeline Stages (Dynamic)
CREATE TABLE pipeline_stages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  -- 'New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'
  color       VARCHAR(20) DEFAULT '#6b7280',
  sort_order  INT DEFAULT 0,
  is_won      BOOLEAN DEFAULT false,
  is_lost     BOOLEAN DEFAULT false,
  is_active   BOOLEAN DEFAULT true
);

-- Custom Form Fields (Dynamic fields for Lead form)
CREATE TABLE custom_fields (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50) NOT NULL,  -- 'lead', 'client', 'quotation'
  field_name    VARCHAR(100) NOT NULL,
  field_label   VARCHAR(255) NOT NULL,
  field_type    VARCHAR(50) NOT NULL,
  -- 'text', 'number', 'date', 'select', 'multi_select', 'checkbox', 'textarea', 'phone', 'email'
  options       JSONB,                 -- For select/multi_select options
  is_required   BOOLEAN DEFAULT false,
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- LEADS — Main Table
CREATE TABLE leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number       SERIAL,            -- L-0001, L-0002...
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(20),
  company           VARCHAR(255),
  designation       VARCHAR(255),
  source_id         UUID REFERENCES lead_sources(id),
  status_id         UUID REFERENCES lead_statuses(id),
  pipeline_stage_id UUID REFERENCES pipeline_stages(id),
  score             INT DEFAULT 0,
  assigned_to       UUID REFERENCES users(id),
  assigned_by       UUID REFERENCES users(id),
  lead_priority     VARCHAR(20) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'urgent'
  lost_reason       VARCHAR(255),
  lost_description  TEXT,
  custom_data       JSONB DEFAULT '{}',  -- Custom field values
  tags              TEXT[],
  country           VARCHAR(100),
  state             VARCHAR(100),
  city              VARCHAR(100),
  address           TEXT,
  pincode           VARCHAR(20),
  industry_id       UUID,
  category_id       UUID,
  sub_source        VARCHAR(255),
  duplicate_of      UUID REFERENCES leads(id),
  is_duplicate      BOOLEAN DEFAULT false,
  converted_at      TIMESTAMPTZ,
  converted_to      UUID,              -- client_id
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Score Rules (Dynamic scoring config)
CREATE TABLE lead_score_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  field       VARCHAR(100) NOT NULL,   -- 'source', 'email_present', 'phone_present'
  condition   VARCHAR(50) NOT NULL,    -- 'equals', 'not_null', 'contains'
  value       VARCHAR(255),
  score       INT NOT NULL,
  is_active   BOOLEAN DEFAULT true
);

-- Activities (Call, Meeting, Email, WhatsApp log)
CREATE TABLE activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50) NOT NULL,   -- 'lead', 'client'
  entity_id     UUID NOT NULL,
  type          VARCHAR(50) NOT NULL,
  -- 'call', 'email', 'whatsapp', 'meeting', 'note', 'sms', 'task'
  subject       VARCHAR(500),
  description   TEXT,
  outcome       VARCHAR(100),           -- 'connected', 'not_connected', 'callback'
  duration_mins INT,
  scheduled_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  is_completed  BOOLEAN DEFAULT false,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-ups & Tasks
CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50) NOT NULL,
  entity_id     UUID NOT NULL,
  title         VARCHAR(500) NOT NULL,
  description   TEXT,
  type          VARCHAR(50) DEFAULT 'follow_up',
  -- 'follow_up', 'call', 'meeting', 'email', 'whatsapp', 'custom'
  due_date      TIMESTAMPTZ,
  assigned_to   UUID REFERENCES users(id),
  is_completed  BOOLEAN DEFAULT false,
  completed_at  TIMESTAMPTZ,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Clients (Lead convert hone ke baad)
CREATE TABLE clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_number     SERIAL,            -- C-0001...
  lead_id           UUID REFERENCES leads(id),
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(20),
  company           VARCHAR(255),
  designation       VARCHAR(255),
  type              VARCHAR(50) DEFAULT 'individual',   -- 'individual', 'company'
  category_id       UUID,
  status            VARCHAR(50) DEFAULT 'active',
  total_deal_value  DECIMAL(15,2) DEFAULT 0,
  custom_data       JSONB DEFAULT '{}',
  tags              TEXT[],
  assigned_to       UUID REFERENCES users(id),
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Quotations
CREATE TABLE quotations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number    VARCHAR(50),          -- Q-2024-0001
  lead_id         UUID REFERENCES leads(id),
  client_id       UUID REFERENCES clients(id),
  title           VARCHAR(500),
  status          VARCHAR(50) DEFAULT 'draft',
  -- 'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'
  items           JSONB NOT NULL DEFAULT '[]',
  -- [{name, description, qty, rate, tax_pct, amount}]
  subtotal        DECIMAL(15,2) DEFAULT 0,
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount    DECIMAL(15,2) DEFAULT 0,
  currency        VARCHAR(10) DEFAULT 'INR',
  valid_until     DATE,
  terms           TEXT,
  notes           TEXT,
  pdf_url         VARCHAR(500),
  sent_at         TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Deals / Opportunities
CREATE TABLE deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_number     VARCHAR(50),
  lead_id         UUID REFERENCES leads(id),
  client_id       UUID REFERENCES clients(id),
  quotation_id    UUID REFERENCES quotations(id),
  title           VARCHAR(500),
  expected_value  DECIMAL(15,2),
  probability     INT DEFAULT 50,        -- percentage
  stage_id        UUID REFERENCES pipeline_stages(id),
  closing_date    DATE,
  status          VARCHAR(50) DEFAULT 'open',
  -- 'open', 'won', 'lost'
  won_at          TIMESTAMPTZ,
  lost_at         TIMESTAMPTZ,
  lost_reason     TEXT,
  assigned_to     UUID REFERENCES users(id),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50) NOT NULL,
  entity_id     UUID NOT NULL,
  name          VARCHAR(255) NOT NULL,
  file_path     VARCHAR(500) NOT NULL,
  file_size     BIGINT,
  mime_type     VARCHAR(100),
  version       INT DEFAULT 1,
  uploaded_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  VARCHAR(50),
  client_id       UUID REFERENCES clients(id),
  deal_id         UUID REFERENCES deals(id),
  quotation_id    UUID REFERENCES quotations(id),
  items           JSONB NOT NULL DEFAULT '[]',
  subtotal        DECIMAL(15,2) DEFAULT 0,
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount    DECIMAL(15,2) DEFAULT 0,
  paid_amount     DECIMAL(15,2) DEFAULT 0,
  due_amount      DECIMAL(15,2) DEFAULT 0,
  status          VARCHAR(50) DEFAULT 'unpaid',
  -- 'unpaid', 'partial', 'paid', 'overdue', 'cancelled'
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID REFERENCES invoices(id),
  client_id       UUID REFERENCES clients(id),
  amount          DECIMAL(15,2) NOT NULL,
  payment_mode    VARCHAR(50),  -- 'cash', 'bank_transfer', 'upi', 'cheque', 'card'
  reference_no    VARCHAR(255),
  payment_date    DATE,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Automation Workflows
CREATE TABLE workflows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_on  VARCHAR(100) NOT NULL,
  -- 'lead_created', 'stage_changed', 'score_changed', 'task_due', 'lead_assigned'
  conditions  JSONB DEFAULT '[]',
  actions     JSONB NOT NULL DEFAULT '[]',
  -- [{type: 'send_email', ...}, {type: 'send_whatsapp', ...}, {type: 'create_task', ...}]
  is_active   BOOLEAN DEFAULT true,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(500) NOT NULL,
  body        TEXT,
  type        VARCHAR(50) DEFAULT 'info',
  link        VARCHAR(500),
  is_read     BOOLEAN DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp / Email Templates (Dynamic)
CREATE TABLE templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(50) NOT NULL,  -- 'whatsapp', 'email', 'sms'
  name        VARCHAR(255) NOT NULL,
  subject     VARCHAR(500),
  body        TEXT NOT NULL,
  variables   TEXT[],                -- ['{{name}}', '{{company}}']
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Integration Settings (Per client)
CREATE TABLE integrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(100) NOT NULL,
  -- 'whatsapp', 'smtp', 'sms', 'indiamart', 'meta_ads', 'google_ads'
  config      JSONB NOT NULL DEFAULT '{}',  -- encrypted configs
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Company Settings
CREATE TABLE settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(255) UNIQUE NOT NULL,
  value       JSONB,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. NestJS Backend — Folder Structure

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── config/
│   │   ├── database.config.ts    # pg pool setup — master DB
│   │   ├── redis.config.ts
│   │   └── env.validation.ts
│   │
│   ├── common/
│   │   ├── guards/
│   │   │   ├── jwt.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   ├── ip.guard.ts
│   │   │   └── super-admin.guard.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── current-db.decorator.ts   # tenant DB pool inject
│   │   │   └── roles.decorator.ts
│   │   ├── interceptors/
│   │   │   ├── audit-log.interceptor.ts
│   │   │   └── response-transform.interceptor.ts
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── database/
│   │       ├── db-manager.service.ts   # CREATE DATABASE, provision tables
│   │       └── tenant-pool.service.ts  # Per-tenant connection pool cache
│   │
│   ├── modules/
│   │   ├── super-admin/          # Phase 1
│   │   │   ├── super-admin.module.ts
│   │   │   ├── super-admin.controller.ts
│   │   │   ├── super-admin.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── auth/                 # Phase 1
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   └── dto/
│   │   │
│   │   ├── users/                # Phase 1
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── leads/                # Phase 2
│   │   ├── clients/              # Phase 5
│   │   ├── quotations/           # Phase 4
│   │   ├── deals/                # Phase 4
│   │   ├── tasks/                # Phase 3
│   │   ├── activities/           # Phase 3
│   │   ├── documents/            # Phase 4
│   │   ├── finance/              # Phase 5
│   │   ├── automation/           # Phase 6
│   │   ├── notifications/        # Phase 3
│   │   ├── reports/              # Phase 7
│   │   ├── ai/                   # Phase 6
│   │   ├── masters/              # Phase 7
│   │   ├── settings/             # Phase 7
│   │   └── integrations/         # Phase 7
│   │
│   └── websocket/
│       └── notifications.gateway.ts
│
├── sql/
│   ├── master/
│   │   └── 001_master_schema.sql   # crm_master tables
│   └── tenant/
│       └── 001_tenant_schema.sql   # crm_client_* tables
│
├── .env
├── package.json
└── tsconfig.json
```

---

## 6. React Frontend — Folder Structure

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── lib/
│   │   ├── api.ts            # axios instance with interceptors
│   │   ├── socket.ts         # socket.io setup
│   │   └── utils.ts
│   │
│   ├── store/                # Zustand
│   │   ├── auth.store.ts
│   │   └── notification.store.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── usePermission.ts
│   │
│   ├── components/           # Reusable components
│   │   ├── ui/               # shadcn components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── AppLayout.tsx
│   │   ├── DataTable.tsx     # Universal table component
│   │   ├── DynamicForm.tsx   # Dynamic fields render
│   │   ├── KanbanBoard.tsx   # Pipeline view
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── super-admin/      # Super Admin Panel
│   │   │   ├── Dashboard.tsx
│   │   │   └── Companies.tsx
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   └── ChangePassword.tsx
│   │   ├── dashboard/
│   │   ├── leads/
│   │   ├── clients/
│   │   ├── quotations/
│   │   ├── finance/
│   │   ├── reports/
│   │   ├── users/
│   │   ├── masters/
│   │   └── settings/
│   │
│   └── router/
│       ├── index.tsx
│       ├── SuperAdminRoute.tsx
│       ├── PrivateRoute.tsx
│       └── PermissionRoute.tsx
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 7. Auth Flow — Detailed

### Super Admin Login
```
POST /api/super-admin/auth/login
  → Validate credentials in crm_master.super_admins
  → Return: access_token (15min) + refresh_token (30 days)
  → Frontend store karta hai → Super Admin Panel access

POST /api/super-admin/companies (company create)
  → crm_master.companies mein entry
  → CREATE DATABASE crm_client_{slug}
  → Tenant tables provision (SQL file run)
  → Admin user create (temporary password)
  → Email send (admin ko login credentials)
```

### Admin / User Login
```
POST /api/auth/login { email, password, company_slug? }
  → company_slug se crm_master mein DB name lookup
  → Uss DB mein user verify
  → JWT payload: { userId, role, dbName, companySlug }
  → Return: access_token + refresh_token
```

### JWT Payload Structure
```typescript
{
  sub: "user-uuid",
  role: "admin" | "manager" | "agent",
  dbName: "crm_client_abc_corp",
  companySlug: "abc-corp",
  type: "access"
}
```

### Middleware Flow (Every Request)
```
Request → JwtGuard (verify token) 
        → Extract dbName from JWT 
        → TenantPoolService.getPool(dbName) 
        → Inject pool into request
        → Controller/Service uses this pool
        → RolesGuard checks permissions
        → IpGuard checks whitelist (if enabled)
```

---

## 8. Dynamic Form System — Kaise Kaam Karega

```
Admin custom fields configure karta hai:
  → custom_fields table mein entry
  → field_type: text, number, date, select, multi_select, checkbox, textarea

Frontend:
  → GET /api/masters/custom-fields?entity=lead
  → Response mein fields array
  → DynamicForm component render karta hai fields
  → Submit hote waqt custom_data: {} mein save

Lead mein:
  → leads.custom_data = { "GST Number": "ABC123", "Budget Range": "5-10L" }
```

---

## 9. Phase-wise Build Order

```
PHASE 1 — Auth & Foundation (Start Here)
├── Backend
│   ├── Project setup (NestJS + pg + Redis + JWT)
│   ├── crm_master DB + schema
│   ├── Super Admin auth (login, refresh)
│   ├── Company provisioning (create DB, run SQL, create admin)
│   ├── Client auth (login, refresh, change password)
│   ├── Tenant middleware (pool injection)
│   └── User management (CRUD, roles, permissions)
│
└── Frontend
    ├── Project setup (React + Vite + shadcn + Tailwind)
    ├── Super Admin login + dashboard
    ├── Company management (list, create, activate/deactivate)
    ├── Admin login + change password flow
    └── User management panel

PHASE 2 — Lead Management
├── Lead capture (manual entry + webhook)
├── Duplicate detection
├── Lead scoring engine
├── Auto assignment rules
└── Pipeline/Kanban view

PHASE 3 — Communication & Tasks
├── Follow-ups & tasks
├── Activity logging
├── Notifications (in-app + email)
└── WhatsApp integration (basic)

PHASE 4 — Deals & Quotations
├── Quotation builder (dynamic line items)
├── PDF generation
├── Deal management
└── Documents

PHASE 5 — Clients & Finance
├── Lead → Client conversion
├── Client 360° view
├── Invoices + payments
└── GST reports

PHASE 6 — Automation & AI
├── Workflow builder
├── Trigger-based automation
└── AI scoring + suggestions

PHASE 7 — Reports & Masters
├── All analytics reports
├── Dynamic masters management
└── Settings (all)

PHASE 8 — Security & Polish
├── 2FA
├── IP restriction enforcement
├── Audit logs UI
└── Performance optimization
```

---

## 10. API Design — Conventions

```
Base URLs:
  /api/super-admin/*  → Super Admin panel (super-admin.guard.ts)
  /api/auth/*         → Login, refresh, logout
  /api/*              → Client panel (jwt.guard.ts + tenant middleware)

Response Format:
{
  "success": true,
  "data": { ... },
  "message": "Lead created successfully",
  "meta": { "total": 100, "page": 1, "limit": 20 }
}

Error Format:
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Email is required",
  "statusCode": 400
}
```

---

## 11. Environment Variables

```env
# Backend .env

# Master DB
MASTER_DB_HOST=localhost
MASTER_DB_PORT=5432
MASTER_DB_NAME=crm_master
MASTER_DB_USER=postgres
MASTER_DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# App
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app-password

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Super Admin (First time setup)
SUPER_ADMIN_EMAIL=superadmin@yourcrm.com
SUPER_ADMIN_PASSWORD=SuperSecurePass123!
```

---

## 12. UI/UX Design Decisions — MNC Level

- **Color Scheme**: Dark sidebar (#0f172a) + White content area — Professional, clean
- **Typography**: Inter font — Industry standard
- **Components**: shadcn/ui — Consistent, accessible
- **Table**: Custom DataTable with pagination, search, column filters, export
- **Forms**: Multi-step where needed, inline validation
- **Pipeline**: Kanban drag-drop (dnd-kit) + List view toggle
- **Dashboard**: KPI cards + sparklines + activity feed
- **Mobile**: Responsive but desktop-first (CRM is desktop product)
- **Loading States**: Skeleton loaders, not spinners
- **Empty States**: Illustrated empty states with action buttons
- **Notifications**: Toast (top-right) + Notification bell with count
- **Theme**: Light mode only (Phase 1), dark mode Phase 8

---

## 13. Security Checklist

- [x] Passwords: bcrypt (cost factor 12)
- [x] JWT: RS256 or HS256 with proper expiry
- [x] Refresh token rotation (one-time use)
- [x] SQL injection: parameterized queries only ($1, $2...)
- [x] Rate limiting: Redis-based (login: 5 attempts, API: 100/min)
- [x] CORS: Only frontend origin allowed
- [x] Helmet: Security headers
- [x] IP whitelist: Optional per company
- [x] Audit logs: All write operations logged
- [x] File upload: Type validation, size limit
- [x] 2FA: TOTP (Phase 8)

---

## 14. Development Setup — Local

```bash
# Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- pnpm (package manager)

# Backend
cd backend
pnpm install
pnpm run migration:master   # Create crm_master DB + tables
pnpm run seed:super-admin   # Create first super admin
pnpm run start:dev

# Frontend
cd frontend
pnpm install
pnpm run dev
```

---

## READY. PHASE 1 SE SHURU KARTE HAIN.

**Order:**
1. Backend: NestJS setup + crm_master DB + Super Admin Auth
2. Backend: Company provisioning + Client DB creation
3. Backend: Client Auth (Admin/User login)
4. Backend: User management APIs
5. Frontend: React setup + shadcn + routing
6. Frontend: Super Admin login + Companies panel
7. Frontend: Admin/User login + Password change
8. Frontend: User management UI

**Agli message mein Phase 1 ka actual code start karte hain.**
