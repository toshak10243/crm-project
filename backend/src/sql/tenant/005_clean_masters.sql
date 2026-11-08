-- Migration 005: Clean statuses, lead sources, and expand lead received on channels

-- 1. Cleaned Lead Statuses (Duplicate NEW removed, UNWORKED LEADS removed)
TRUNCATE TABLE lead_statuses CASCADE;
INSERT INTO lead_statuses (name, color, sort_order) VALUES
  ('NEW', '#2563eb', 1),
  ('CALLED ONCE', '#06b6d4', 2),
  ('FOLLOW-UP', '#f59e0b', 3),
  ('DEMO', '#3b82f6', 4),
  ('DEMO COMPLETED', '#059669', 5),
  ('SITE VISIT', '#1d4ed8', 6),
  ('INTERESTED', '#16a34a', 7),
  ('FUTURE PIPELINE', '#8b5cf6', 8),
  ('PAYMENT PENDING', '#eab308', 9),
  ('DEAL CLOSED CLIENT ACHIEVED', '#10b981', 10),
  ('NO RESPONSE', '#6b7280', 11),
  ('NO REQUIREMENT', '#ef4444', 12),
  ('LABORATORY', '#64748b', 13),
  ('EXISTING CLIENTS', '#0d9488', 14),
  ('INVALID NUMBER', '#dc2626', 15);

-- 2. Cleaned Lead Sources (Removed individual names like "sir", kept real enterprise sources)
TRUNCATE TABLE lead_sources CASCADE;
INSERT INTO lead_sources (name, sort_order) VALUES
  ('Other', 1),
  ('Self', 2),
  ('Walk In', 3),
  ('Website Inquiry', 4),
  ('WhatsApp Chat', 5),
  ('IndiaMART', 6),
  ('TradeIndia', 7),
  ('Google Ads', 8),
  ('Meta Ads', 9),
  ('BNI Network', 10),
  ('Referral Partner', 11),
  ('Exhibition / Expo', 12),
  ('Cold Calling', 13);

-- 3. Expanded Lead Received On Channels (Real channels jahan se leads aati hain)
TRUNCATE TABLE lead_received_channels CASCADE;
INSERT INTO lead_received_channels (name, sort_order) VALUES
  ('Justdial app', 1),
  ('Phone Call', 2),
  ('WhatsApp', 3),
  ('Website Form', 4),
  ('Social Media (Instagram/Facebook)', 5),
  ('Email Inquiry', 6),
  ('Google Search / My Business', 7),
  ('IndiaMART Portal', 8),
  ('TradeIndia Portal', 9),
  ('Direct Office Visit / Walk-in', 10),
  ('SMS Campaign', 11),
  ('Referral / Word of Mouth', 12);

