-- CRM Tenant Database Schema
-- Ye tables har client ke alag database mein banti hain
-- crm_client_{slug} database mein ye sab hoga

-- UUID extension enable karo
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- USERS & AUTH TABLES
-- =============================================

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  is_system   BOOLEAN DEFAULT false, -- System roles delete nahi ho sakte
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions — Granular module level permissions
CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module      VARCHAR(100) NOT NULL,   -- 'leads', 'clients', 'quotations'
  sub_module  VARCHAR(100),            -- 'all_leads', 'my_leads'
  action      VARCHAR(50) NOT NULL,    -- 'view', 'add', 'edit', 'delete', 'export', 'import', 'approve'
  label       VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Role Permissions mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Users — Admin aur uske agents
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  username      VARCHAR(100) UNIQUE,
  phone         VARCHAR(20) UNIQUE,
  role            VARCHAR(50) NOT NULL DEFAULT 'agent',
  -- 'admin' | 'manager' | 'agent'
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  phone           VARCHAR(20),
  avatar_url      VARCHAR(500),
  is_active       BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT true, -- Pehli login pe change karna padega
  last_login_at   TIMESTAMPTZ,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- User Refresh Tokens
CREATE TABLE IF NOT EXISTS user_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  ip_address  VARCHAR(50),
  user_agent  TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- IP Whitelist — Admin configure karta hai
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address  VARCHAR(50) NOT NULL,
  label       VARCHAR(100),
  is_active   BOOLEAN DEFAULT true,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MASTER / LOOKUP TABLES — Dynamic config
-- =============================================

-- Lead Sources — Website, WhatsApp, IndiaMART, etc.
CREATE TABLE IF NOT EXISTS lead_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  icon        VARCHAR(50),
  is_active   BOOLEAN DEFAULT true,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Statuses — New, Contacted, etc.
CREATE TABLE IF NOT EXISTS lead_statuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(20) DEFAULT '#6b7280',
  is_active   BOOLEAN DEFAULT true,
  sort_order  INT DEFAULT 0
);

-- Pipeline Stages — New, Contacted, Qualified, Proposal, Negotiation, Won, Lost
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(20) DEFAULT '#6b7280',
  sort_order  INT DEFAULT 0,
  is_won      BOOLEAN DEFAULT false,
  is_lost     BOOLEAN DEFAULT false,
  is_active   BOOLEAN DEFAULT true
);

-- Lead Industries
CREATE TABLE IF NOT EXISTS lead_industries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  is_active   BOOLEAN DEFAULT true
);

-- Lead Categories
CREATE TABLE IF NOT EXISTS lead_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  is_active   BOOLEAN DEFAULT true
);

-- Lost Reasons
CREATE TABLE IF NOT EXISTS lost_reasons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason      VARCHAR(255) NOT NULL,
  is_active   BOOLEAN DEFAULT true
);

-- Custom Fields — Admin dynamic fields banata hai
CREATE TABLE IF NOT EXISTS custom_fields (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50) NOT NULL,  -- 'lead', 'client', 'quotation'
  field_name    VARCHAR(100) NOT NULL,
  field_label   VARCHAR(255) NOT NULL,
  field_type    VARCHAR(50) NOT NULL,
  -- 'text','number','date','select','multi_select','checkbox','textarea','phone','email'
  options       JSONB,                 -- Select fields ke liye options array
  is_required   BOOLEAN DEFAULT false,
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Templates — WhatsApp, Email, SMS
CREATE TABLE IF NOT EXISTS templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(50) NOT NULL,  -- 'whatsapp', 'email', 'sms'
  name        VARCHAR(255) NOT NULL,
  subject     VARCHAR(500),          -- Email ke liye
  body        TEXT NOT NULL,
  variables   TEXT[],                -- ['{{name}}', '{{company}}']
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- LEADS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number       SERIAL,
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(20),
  alternate_phone   VARCHAR(20),
  company           VARCHAR(255),
  designation       VARCHAR(255),
  source_id         UUID REFERENCES lead_sources(id) ON DELETE SET NULL,
  status_id         UUID REFERENCES lead_statuses(id) ON DELETE SET NULL,
  pipeline_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  industry_id       UUID REFERENCES lead_industries(id) ON DELETE SET NULL,
  category_id       UUID REFERENCES lead_categories(id) ON DELETE SET NULL,
  score             INT DEFAULT 0,
  priority          VARCHAR(20) DEFAULT 'medium', -- 'low','medium','high','urgent'
  assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at       TIMESTAMPTZ,
  lost_reason_id    UUID REFERENCES lost_reasons(id) ON DELETE SET NULL,
  lost_description  TEXT,
  custom_data       JSONB DEFAULT '{}',  -- Custom fields ka data
  tags              TEXT[] DEFAULT '{}',
  country           VARCHAR(100),
  state             VARCHAR(100),
  city              VARCHAR(100),
  address           TEXT,
  pincode           VARCHAR(20),
  website           VARCHAR(500),
  is_duplicate      BOOLEAN DEFAULT false,
  duplicate_of      UUID REFERENCES leads(id) ON DELETE SET NULL,
  converted_at      TIMESTAMPTZ,
  converted_to      UUID,               -- client id
  is_deleted        BOOLEAN DEFAULT false,
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Score Rules — Admin configure karta hai
CREATE TABLE IF NOT EXISTS lead_score_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  field       VARCHAR(100) NOT NULL,
  condition   VARCHAR(50) NOT NULL,  -- 'not_null', 'equals', 'contains'
  value       VARCHAR(255),
  score       INT NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto Assignment Rules
CREATE TABLE IF NOT EXISTS assignment_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  conditions    JSONB DEFAULT '[]',   -- [{field, operator, value}]
  assign_to     UUID REFERENCES users(id) ON DELETE CASCADE,
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ACTIVITIES & TASKS
-- =============================================

-- Activities — Call logs, emails sent, WhatsApp sent, etc.
CREATE TABLE IF NOT EXISTS activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50) NOT NULL,  -- 'lead', 'client'
  entity_id     UUID NOT NULL,
  type          VARCHAR(50) NOT NULL,
  -- 'call','email','whatsapp','meeting','note','sms'
  subject       VARCHAR(500),
  description   TEXT,
  outcome       VARCHAR(100),          -- 'connected','not_connected','callback'
  duration_mins INT,
  scheduled_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  is_completed  BOOLEAN DEFAULT false,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks & Follow-ups
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50) NOT NULL,
  entity_id     UUID NOT NULL,
  title         VARCHAR(500) NOT NULL,
  description   TEXT,
  type          VARCHAR(50) DEFAULT 'follow_up',
  -- 'follow_up','call','meeting','email','whatsapp','custom'
  due_date      TIMESTAMPTZ,
  assigned_to   UUID REFERENCES users(id) ON DELETE SET NULL,
  is_completed  BOOLEAN DEFAULT false,
  completed_at  TIMESTAMPTZ,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CLIENTS
-- =============================================

CREATE TABLE IF NOT EXISTS clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_number     SERIAL,
  lead_id           UUID REFERENCES leads(id) ON DELETE SET NULL,
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(20),
  alternate_phone   VARCHAR(20),
  company           VARCHAR(255),
  designation       VARCHAR(255),
  type              VARCHAR(50) DEFAULT 'individual', -- 'individual','company'
  category_id       UUID REFERENCES lead_categories(id) ON DELETE SET NULL,
  status            VARCHAR(50) DEFAULT 'active',
  total_deal_value  DECIMAL(15,2) DEFAULT 0,
  custom_data       JSONB DEFAULT '{}',
  tags              TEXT[] DEFAULT '{}',
  country           VARCHAR(100),
  state             VARCHAR(100),
  city              VARCHAR(100),
  address           TEXT,
  pincode           VARCHAR(20),
  assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted        BOOLEAN DEFAULT false,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUOTATIONS & DEALS
-- =============================================

CREATE TABLE IF NOT EXISTS quotations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number    VARCHAR(50),
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  title           VARCHAR(500),
  status          VARCHAR(50) DEFAULT 'draft',
  -- 'draft','sent','accepted','rejected','expired','converted'
  items           JSONB NOT NULL DEFAULT '[]',
  -- [{name, description, qty, rate, tax_pct, amount}]
  subtotal        DECIMAL(15,2) DEFAULT 0,
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  discount_type   VARCHAR(20) DEFAULT 'fixed', -- 'fixed','percentage'
  discount_value  DECIMAL(15,2) DEFAULT 0,
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
  is_deleted      BOOLEAN DEFAULT false,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_number     VARCHAR(50),
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  quotation_id    UUID REFERENCES quotations(id) ON DELETE SET NULL,
  title           VARCHAR(500) NOT NULL,
  expected_value  DECIMAL(15,2),
  probability     INT DEFAULT 50,
  stage_id        UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  closing_date    DATE,
  status          VARCHAR(50) DEFAULT 'open', -- 'open','won','lost'
  won_at          TIMESTAMPTZ,
  lost_at         TIMESTAMPTZ,
  lost_reason     TEXT,
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted      BOOLEAN DEFAULT false,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DOCUMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50) NOT NULL,  -- 'lead','client','quotation','deal'
  entity_id     UUID NOT NULL,
  name          VARCHAR(255) NOT NULL,
  file_path     VARCHAR(500) NOT NULL,
  file_size     BIGINT,
  mime_type     VARCHAR(100),
  version       INT DEFAULT 1,
  uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FINANCE
-- =============================================

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  VARCHAR(50),
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  quotation_id    UUID REFERENCES quotations(id) ON DELETE SET NULL,
  items           JSONB NOT NULL DEFAULT '[]',
  subtotal        DECIMAL(15,2) DEFAULT 0,
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount    DECIMAL(15,2) DEFAULT 0,
  paid_amount     DECIMAL(15,2) DEFAULT 0,
  due_amount      DECIMAL(15,2) DEFAULT 0,
  status          VARCHAR(50) DEFAULT 'unpaid',
  -- 'unpaid','partial','paid','overdue','cancelled'
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  is_deleted      BOOLEAN DEFAULT false,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID REFERENCES invoices(id) ON DELETE SET NULL,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  amount        DECIMAL(15,2) NOT NULL,
  payment_mode  VARCHAR(50),
  -- 'cash','bank_transfer','upi','cheque','card'
  reference_no  VARCHAR(255),
  payment_date  DATE,
  notes         TEXT,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AUTOMATION
-- =============================================

CREATE TABLE IF NOT EXISTS workflows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_on  VARCHAR(100) NOT NULL,
  -- 'lead_created','stage_changed','score_changed','task_due','lead_assigned'
  conditions  JSONB DEFAULT '[]',
  actions     JSONB NOT NULL DEFAULT '[]',
  is_active   BOOLEAN DEFAULT true,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS & AUDIT
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(500) NOT NULL,
  body        TEXT,
  type        VARCHAR(50) DEFAULT 'info', -- 'info','success','warning','error'
  link        VARCHAR(500),
  is_read     BOOLEAN DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  user_name   VARCHAR(255),
  action      VARCHAR(100) NOT NULL,  -- 'CREATE','UPDATE','DELETE'
  entity_type VARCHAR(100),
  entity_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Company Settings — Key value store
CREATE TABLE IF NOT EXISTS settings (
  key         VARCHAR(255) PRIMARY KEY,
  value       JSONB,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations config
CREATE TABLE IF NOT EXISTS integrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(100) NOT NULL UNIQUE,
  -- 'whatsapp','smtp','sms','indiamart','meta_ads'
  config      JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DEFAULT DATA INSERT
-- =============================================

-- Default Pipeline Stages
INSERT INTO pipeline_stages (name, color, sort_order, is_won, is_lost) VALUES
  ('New', '#6b7280', 1, false, false),
  ('Contacted', '#3b82f6', 2, false, false),
  ('Qualified', '#8b5cf6', 3, false, false),
  ('Proposal', '#f59e0b', 4, false, false),
  ('Negotiation', '#ef4444', 5, false, false),
  ('Won', '#10b981', 6, true, false),
  ('Lost', '#6b7280', 7, false, true)
ON CONFLICT DO NOTHING;

-- Default Lead Statuses
INSERT INTO lead_statuses (name, color, sort_order) VALUES
  ('New', '#6b7280', 1),
  ('Contacted', '#3b82f6', 2),
  ('Follow Up', '#f59e0b', 3),
  ('Interested', '#10b981', 4),
  ('Not Interested', '#ef4444', 5),
  ('Converted', '#8b5cf6', 6)
ON CONFLICT DO NOTHING;

-- Default Lead Sources
INSERT INTO lead_sources (name, sort_order) VALUES
  ('Website', 1),
  ('WhatsApp', 2),
  ('IndiaMART', 3),
  ('Meta Ads', 4),
  ('Google Ads', 5),
  ('LinkedIn', 6),
  ('Email', 7),
  ('Referral', 8),
  ('Cold Call', 9),
  ('Other', 10)
ON CONFLICT DO NOTHING;

-- Default Roles
INSERT INTO roles (name, description, is_system) VALUES
  ('admin', 'Full access to everything', true),
  ('manager', 'Can manage team and leads', true),
  ('agent', 'Can manage own leads only', true)
ON CONFLICT DO NOTHING;

-- Default Settings
INSERT INTO settings (key, value) VALUES
  ('company_name', '"My Company"'),
  ('currency', '"INR"'),
  ('date_format', '"DD/MM/YYYY"'),
  ('ip_restriction_enabled', 'false'),
  ('lead_auto_assign', 'false')
ON CONFLICT DO NOTHING;

-- =============================================
-- INDEXES — Faster queries ke liye
-- =============================================

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON leads(pipeline_stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_is_deleted ON leads(is_deleted);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_entity ON tasks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON clients(assigned_to);

-- User OTP table -- forgot password ke liye
CREATE TABLE IF NOT EXISTS user_otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL,
  otp         VARCHAR(6) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  is_used     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_otps_email 
ON user_otps(email);