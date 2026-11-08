-- Migration 004: Ensure exact DB records matching real CRM screenshots

-- 1. Campaigns from Image 1
TRUNCATE TABLE campaigns CASCADE;
INSERT INTO campaigns (name, type) VALUES
  ('Walk-in', 'offline'),
  ('Social', 'digital'),
  ('News', 'media')
ON CONFLICT DO NOTHING;

-- 2. Lead Received On from Image 2
CREATE TABLE IF NOT EXISTS lead_received_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  sort_order  INT DEFAULT 0
);

TRUNCATE TABLE lead_received_channels CASCADE;
INSERT INTO lead_received_channels (name, sort_order) VALUES
  ('Justdial app', 1),
  ('Phone', 2),
  ('Social', 3),
  ('Email', 4),
  ('Whatsapp', 5)
ON CONFLICT DO NOTHING;

-- 3. Lead Statuses from Image 3 (exact list)
TRUNCATE TABLE lead_statuses CASCADE;
INSERT INTO lead_statuses (name, color, sort_order) VALUES
  ('NO REQUIREMENT', '#ef4444', 1),
  ('DEAL CLOSED CLIENT ACHIEVED', '#10b981', 2),
  ('DEMO', '#3b82f6', 3),
  ('FOLLOW-UP', '#f59e0b', 4),
  ('NO RESPONSE', '#6b7280', 5),
  ('NEW', '#2563eb', 6),
  ('PAYMENT PENDING', '#eab308', 7),
  ('CALLED ONCE', '#06b6d4', 8),
  ('FUTURE PIPELINE', '#8b5cf6', 9),
  ('DEMO COMPLETED', '#059669', 10),
  ('SITE VISIT', '#1d4ed8', 11),
  ('INTERESTED', '#16a34a', 12),
  ('LABORATORY', '#64748b', 13),
  ('INVALID NUMBER', '#dc2626', 14),
  ('EXISTING CLIENTS', '#0d9488', 15),
  ('UNWORKED LEADS – SD JAIN COLLEGE – TYBCA', '#9333ea', 16)
ON CONFLICT DO NOTHING;

-- 4. Lead Sources (Lead From)
TRUNCATE TABLE lead_sources CASCADE;
INSERT INTO lead_sources (name, sort_order) VALUES
  ('Other', 1),
  ('Surat', 2),
  ('Ankit Choudhari sir', 3),
  ('Darpan sir', 4),
  ('Rajiv sir', 5),
  ('Delhi', 6),
  ('Textile', 7),
  ('CA DEMO', 8),
  ('Walk In', 9),
  ('Self', 10),
  ('BNI Hyderabad', 11),
  ('Wa daddy', 12),
  ('Via Burhan', 13),
  ('EduCa CRM', 14),
  ('Mizo CRM', 15)
ON CONFLICT DO NOTHING;

