-- CRM Master Database Schema
-- Ye tables sirf crm_master database mein hoti hain
-- Super Admin aur Companies ka data yahan rehta hai

-- UUID extension enable karo
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Super Admins table
-- Sirf humara account hoga is mein -- CRM ka owner
CREATE TABLE IF NOT EXISTS super_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username      VARCHAR(100) UNIQUE,
  phone         VARCHAR(20) UNIQUE,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Super Admin Refresh Tokens
-- Login ke baad refresh token yahan store hota hai
CREATE TABLE IF NOT EXISTS super_admin_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id  UUID NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
  token_hash      VARCHAR(255) NOT NULL,
  ip_address      VARCHAR(50),
  user_agent      TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table
-- Har ek client company ka record yahan hoga
CREATE TABLE IF NOT EXISTS companies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  slug                  VARCHAR(100) UNIQUE NOT NULL,
  admin_name            VARCHAR(255) NOT NULL,
  admin_email           VARCHAR(255) UNIQUE NOT NULL,
  db_name               VARCHAR(100) UNIQUE NOT NULL,
  phone                 VARCHAR(20),
  address               TEXT,
  is_active             BOOLEAN DEFAULT true,
  activated_at          TIMESTAMPTZ DEFAULT NOW(),
  expires_at            TIMESTAMPTZ,

  -- Subscription fields
  plan                  VARCHAR(50) DEFAULT 'trial',
  -- 'trial' | 'active' | 'expired' | 'suspended'
  trial_ends_at         TIMESTAMPTZ,
  subscription_start_at TIMESTAMPTZ,
  subscription_ends_at  TIMESTAMPTZ,
  subscription_plan     VARCHAR(50) DEFAULT '1year',
  subscription_amount   DECIMAL(10,2),
  payment_reference     VARCHAR(255),
  payment_notes         TEXT,
  payment_verified_at   TIMESTAMPTZ,
  payment_verified_by   UUID REFERENCES super_admins(id),

  created_by            UUID REFERENCES super_admins(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON companies(plan);
CREATE INDEX IF NOT EXISTS idx_companies_trial_ends ON companies(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_companies_sub_ends ON companies(subscription_ends_at);
CREATE INDEX IF NOT EXISTS idx_super_admin_tokens_super_admin_id 
ON super_admin_tokens(super_admin_id);

-- Super Admin OTP table -- forgot password ke liye
CREATE TABLE IF NOT EXISTS super_admin_otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL,
  otp         VARCHAR(6) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  is_used     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_otps_email
ON super_admin_otps(email);

-- Payment Requests table
-- Admin payment request bhejta hai -- Super Admin verify karta hai
CREATE TABLE IF NOT EXISTS payment_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan            VARCHAR(50) NOT NULL DEFAULT '1year',
  amount          DECIMAL(10,2) NOT NULL,
  payment_mode    VARCHAR(50),
  -- 'bank_transfer' | 'upi' | 'cash' | 'cheque'
  reference_no    VARCHAR(255),
  screenshot_url  VARCHAR(500),
  notes           TEXT,
  status          VARCHAR(50) DEFAULT 'pending',
  -- 'pending' | 'verified' | 'rejected'
  verified_by     UUID REFERENCES super_admins(id),
  verified_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_company
ON payment_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status
ON payment_requests(status);