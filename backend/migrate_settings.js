const { Client } = require('pg');

async function migrate() {
  for (const db of ['crm_tenant_apex', 'crm_client_sharma_traders']) {
    try {
      const c = new Client({ connectionString: 'postgresql://postgres:Root%40123@localhost:5432/' + db });
      await c.connect();
      
      // 1. Add assigned_manager_id to lead_sources
      await c.query(`
        ALTER TABLE lead_sources 
        ADD COLUMN IF NOT EXISTS assigned_manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
      `);

      // 2. Ensure templates table exists
      await c.query(`
        CREATE TABLE IF NOT EXISTS templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
          name VARCHAR(255) NOT NULL,
          subject VARCHAR(255),
          body TEXT NOT NULL,
          variables TEXT[],
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 3. Ensure settings key
      await c.query(`
        INSERT INTO settings (key, value, updated_at)
        VALUES ('auto_assign_leads', 'false'::jsonb, NOW())
        ON CONFLICT (key) DO NOTHING;
      `);

      // 4. Seed Toshak Sharma into lead_sources as user requested: "Lead From wala dynamic abhi ek dalna Toshak Sharma name se"
      await c.query(`
        INSERT INTO lead_sources (name, is_active, sort_order)
        SELECT 'Toshak Sharma', true, 1
        WHERE NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Toshak Sharma');
      `);

      // 5. Seed common reference lead sources from screenshot if not present
      const sourcesToSeed = [
        'Surat', 'Ankit Choudhari sir', 'Darpan sir', 'Rajiv sir', 'Delhi', 'Textile', 'CA DEMO', 'Walk In', 'Self', 'BNI Hyderabad'
      ];
      let sort = 2;
      for (const src of sourcesToSeed) {
        await c.query(`
          INSERT INTO lead_sources (name, is_active, sort_order)
          SELECT '${src}', true, ${sort}
          WHERE NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = '${src}');
        `);
        sort++;
      }

      // 6. Seed sample WhatsApp and Email templates from screenshots
      await c.query(`
        INSERT INTO templates (type, name, subject, body, is_active)
        SELECT 'whatsapp', 'Welcome to CRM', NULL, 'Hi,\\n\\nWelcome to CRM! We build smart, scalable solutions that actually work for your business.\\n\\nWarm Regards,\\nTeam CRM', true
        WHERE NOT EXISTS (SELECT 1 FROM templates WHERE type = 'whatsapp' AND name = 'Welcome to CRM');
      `);

      await c.query(`
        INSERT INTO templates (type, name, subject, body, is_active)
        SELECT 'whatsapp', 'Follow-Up Template (After First Call)', NULL, 'Hi,\\n\\nThank you for your time today! As discussed, we are excited to introduce our CRM designed to help service businesses.\\n\\nWarm regards,\\nTeam CRM', true
        WHERE NOT EXISTS (SELECT 1 FROM templates WHERE type = 'whatsapp' AND name = 'Follow-Up Template (After First Call)');
      `);

      await c.query(`
        INSERT INTO templates (type, name, subject, body, is_active)
        SELECT 'email', 'Thank You - Staying Connected', 'Thank You - Staying Connected for Future Opportunities', 'Hi [Client Name],\\n\\nThank you again for considering our CRM. While we understand you are not moving forward with us at this time, we truly appreciate the opportunity.\\n\\nWarm regards,\\nTeam CRM', true
        WHERE NOT EXISTS (SELECT 1 FROM templates WHERE type = 'email' AND name = 'Thank You - Staying Connected');
      `);

      // 7. Seed standard statuses from screenshot 1 if not present
      const statusesToSeed = [
        { name: 'NO REQUIREMENT', color: '#ef4444' },
        { name: 'DEAL CLOSED CLIENT ACHIEVED', color: '#22c55e' },
        { name: 'DEMO', color: '#3b82f6' },
        { name: 'FOLLOW-UP', color: '#a855f7' },
        { name: 'NO RESPONSE', color: '#0f172a' },
        { name: 'NEW', color: '#881337' },
        { name: 'PAYMENT PENDING', color: '#eab308' },
        { name: 'FUTURE PIPELINE', color: '#94a3b8' },
        { name: 'DEMO COMPLETED', color: '#06b6d4' },
        { name: 'INTERESTED', color: '#2563eb' }
      ];

      for (let i = 0; i < statusesToSeed.length; i++) {
        const s = statusesToSeed[i];
        await c.query(`
          INSERT INTO lead_statuses (name, color, is_active, sort_order)
          SELECT '${s.name}', '${s.color}', true, ${i + 1}
          WHERE NOT EXISTS (SELECT 1 FROM lead_statuses WHERE name = '${s.name}');
        `);
      }

      console.log('Migrated & Seeded Settings in ' + db);
      await c.end();
    } catch (e) {
      console.error('Error migrating ' + db, e);
    }
  }
}

migrate();

