-- 009_branches_ivr_fix.sql
-- Ensure ivr_calls, branches location/created_by_name, and lead_activity_history exist

CREATE TABLE IF NOT EXISTS ivr_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_type VARCHAR(20) NOT NULL DEFAULT 'outgoing',
  caller VARCHAR(255),
  receiver VARCHAR(255),
  recording_url TEXT,
  call_duration VARCHAR(50),
  lead_id UUID,
  lead_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ivr_calls_call_type ON ivr_calls(call_type);
CREATE INDEX IF NOT EXISTS idx_ivr_calls_created_at ON ivr_calls(created_at);

ALTER TABLE branches ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);

CREATE TABLE IF NOT EXISTS lead_activity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_by_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_activity_history_lead_id ON lead_activity_history(lead_id);
