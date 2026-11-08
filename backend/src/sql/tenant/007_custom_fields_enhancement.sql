-- Migration 007: Custom Form Fields Enhancement
CREATE TABLE IF NOT EXISTS custom_fields (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50) NOT NULL DEFAULT 'lead',
  field_name    VARCHAR(100) NOT NULL,
  field_label   VARCHAR(255) NOT NULL,
  field_type    VARCHAR(50) NOT NULL,
  options       JSONB,
  is_required   BOOLEAN DEFAULT false,
  default_value TEXT,
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS default_value TEXT;
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE custom_fields ALTER COLUMN entity_type SET DEFAULT 'lead';

-- Seed initial standard custom form fields matching reference screenshots
INSERT INTO custom_fields (entity_type, field_name, field_label, field_type, is_required, options, sort_order)
SELECT 'lead', 'Refer', 'Refer', 'text', false, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM custom_fields WHERE field_name = 'Refer');

INSERT INTO custom_fields (entity_type, field_name, field_label, field_type, is_required, options, sort_order)
SELECT 'lead', 'IELTS SCORE', 'IELTS SCORE', 'number', false, NULL, 2
WHERE NOT EXISTS (SELECT 1 FROM custom_fields WHERE field_name = 'IELTS SCORE');

INSERT INTO custom_fields (entity_type, field_name, field_label, field_type, is_required, options, sort_order)
SELECT 'lead', 'Appointment date', 'Appointment date', 'date', false, NULL, 3
WHERE NOT EXISTS (SELECT 1 FROM custom_fields WHERE field_name = 'Appointment date');

INSERT INTO custom_fields (entity_type, field_name, field_label, field_type, is_required, options, sort_order)
SELECT 'lead', 'Services opted', 'Services opted', 'checkbox', false, '["A", "B", "C"]'::jsonb, 4
WHERE NOT EXISTS (SELECT 1 FROM custom_fields WHERE field_name = 'Services opted');

INSERT INTO custom_fields (entity_type, field_name, field_label, field_type, is_required, options, sort_order)
SELECT 'lead', 'Services', 'Services', 'radio', false, '["Buy", "Rent"]'::jsonb, 5
WHERE NOT EXISTS (SELECT 1 FROM custom_fields WHERE field_name = 'Services');

INSERT INTO custom_fields (entity_type, field_name, field_label, field_type, is_required, options, sort_order)
SELECT 'lead', 'Services we offer', 'Services we offer', 'select', false, '["Food", "travel", "hotel"]'::jsonb, 6
WHERE NOT EXISTS (SELECT 1 FROM custom_fields WHERE field_name = 'Services we offer');

INSERT INTO custom_fields (entity_type, field_name, field_label, field_type, is_required, options, sort_order)
SELECT 'lead', 'Restaurant name', 'Restaurant name', 'select', false, '["X Cafe", "Y Restaurant", "Z Cafe"]'::jsonb, 7
WHERE NOT EXISTS (SELECT 1 FROM custom_fields WHERE field_name = 'Restaurant name');

INSERT INTO custom_fields (entity_type, field_name, field_label, field_type, is_required, options, sort_order)
SELECT 'lead', 'Screen', 'Screen', 'checkbox', false, '["Big Screen", "Small Screen", "Both"]'::jsonb, 8
WHERE NOT EXISTS (SELECT 1 FROM custom_fields WHERE field_name = 'Screen');
