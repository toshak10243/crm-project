-- Migration 002: Add branches, campaigns, lead additional fields, and followup remarks
CREATE TABLE IF NOT EXISTS branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(50),
  city        VARCHAR(100),
  state       VARCHAR(100),
  address     TEXT,
  phone       VARCHAR(20),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(50) DEFAULT 'general',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Alter leads table with specific form fields from reference
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_name VARCHAR(150);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS middle_name VARCHAR(150);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_name VARCHAR(150);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_received_on TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_from VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS refer_by VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

-- Followup / Call time details
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_followup_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_time_from TIME;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_time_to TIME;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_remark TEXT;

-- Seed default branch & campaign if empty
INSERT INTO branches (name, code, city) VALUES 
  ('Main Branch', 'HQ-01', 'Mumbai'),
  ('Delhi Branch', 'DEL-01', 'Delhi'),
  ('Bengaluru Branch', 'BLR-01', 'Bengaluru')
ON CONFLICT DO NOTHING;

INSERT INTO campaigns (name) VALUES 
  ('Google Search Campaign'),
  ('Meta Ads Campaign'),
  ('Direct Referral')
ON CONFLICT DO NOTHING;

