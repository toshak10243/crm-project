const { Client } = require('pg');

async function migrateWaDaddy() {
  for (const db of ['crm_tenant_apex', 'crm_client_sharma_traders']) {
    try {
      const c = new Client({ connectionString: 'postgresql://postgres:Root%40123@localhost:5432/' + db });
      await c.connect();

      // 1. WA Contacts Table
      await c.query(`
        CREATE TABLE IF NOT EXISTS wa_contacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          full_name VARCHAR(255) NOT NULL,
          phone VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(255),
          group_name VARCHAR(100) DEFAULT 'General',
          created_by_name VARCHAR(100) DEFAULT 'CRM System',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 2. WA Campaigns Table
      await c.query(`
        CREATE TABLE IF NOT EXISTS wa_campaigns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          campaign_name VARCHAR(255) NOT NULL,
          created_date TIMESTAMPTZ DEFAULT NOW(),
          status VARCHAR(50) DEFAULT 'IN_PROGRESS',
          contacts_count INT DEFAULT 0,
          created_by_name VARCHAR(100) DEFAULT 'CRM System',
          sent_count INT DEFAULT 0,
          failed_count INT DEFAULT 0
        );
      `);

      // 3. WA Templates Table (Meta approved style)
      await c.query(`
        CREATE TABLE IF NOT EXISTS wa_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'Approved', -- 'Approved' | 'Pending' | 'Rejected'
          header_type VARCHAR(50) DEFAULT 'IMAGE', -- 'IMAGE', 'TEXT', 'NONE'
          header_image_url VARCHAR(500),
          body TEXT NOT NULL,
          category VARCHAR(100) DEFAULT 'MARKETING',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 4. WA Chat Messages Table
      await c.query(`
        CREATE TABLE IF NOT EXISTS wa_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contact_id UUID REFERENCES wa_contacts(id) ON DELETE CASCADE,
          sender VARCHAR(20) NOT NULL, -- 'contact' | 'agent'
          text TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          is_read BOOLEAN DEFAULT true
        );
      `);

      // 5. Seed Contacts from Screenshot 1 (Dhaval Bodar & Sneha Ahir)
      const resDhaval = await c.query(`
        INSERT INTO wa_contacts (full_name, phone, email, group_name)
        VALUES ('Dhaval Bodar', '8866412215', NULL, 'General')
        ON CONFLICT (phone) DO UPDATE SET full_name = 'Dhaval Bodar'
        RETURNING id;
      `);
      const dhavalId = resDhaval.rows[0]?.id;

      const resSneha = await c.query(`
        INSERT INTO wa_contacts (full_name, phone, email, group_name)
        VALUES ('Sneha Ahir', '+91 9727291194', 'sneha.smartxcrm@gmail.com', 'General')
        ON CONFLICT (phone) DO UPDATE SET full_name = 'Sneha Ahir', email = 'sneha.smartxcrm@gmail.com'
        RETURNING id;
      `);
      const snehaId = resSneha.rows[0]?.id;

      // 6. Seed Campaigns from Screenshot 2 (S Test, Test 18-08)
      await c.query(`DELETE FROM wa_campaigns;`);
      await c.query(`
        INSERT INTO wa_campaigns (campaign_name, created_date, status, contacts_count, created_by_name, sent_count, failed_count)
        VALUES 
          ('S Test', '2026-08-19 16:32:00+05:30', 'IN_PROGRESS', 7, 'CRM System', 0, 0),
          ('Test 18-08', '2026-08-19 12:14:00+05:30', 'IN_PROGRESS', 2, 'CRM System', 0, 0),
          ('Test 18-08', '2026-08-18 10:45:00+05:30', 'IN_PROGRESS', 3, 'CRM System', 0, 0);
      `);

      // 7. Seed exactly 5 Templates as user requested: "tempalte ein 5 hi dalna db mein sab db se aayega"
      await c.query(`DELETE FROM wa_templates;`);
      await c.query(`
        INSERT INTO wa_templates (name, status, header_type, body, category)
        VALUES 
          (
            'crm_requested_company_profile', 
            'Approved', 
            'IMAGE', 
            'Hello {{1}},\n\nGreetings from CRM!\n\nAs per your enquiry, we''re sharing the requested information regarding our products and services.\n\n• CRM Lead Management\n• Cloud Telephony Integration\n• Digital Marketing & SEO\n• Enterprise Automation', 
            'MARKETING'
          ),
          (
            'crm_service_information_sharing', 
            'Approved', 
            'IMAGE', 
            'Hello {{1}},\n\nGreetings from CRM!\n\nAs per your request, we''re sharing the details of our business solutions for your reference.\n\nOur services include:\n* CRM - Lead Management & Sales Automation\n* WA Cloud Messaging\n* Workflow Triggers', 
            'MARKETING'
          ),
          (
            'crm_company_profile_details', 
            'Approved', 
            'IMAGE', 
            'Hello {{1}},\n\nLooking to simplify your business operations and accelerate growth with the right technology?\n\nWe offer a complete range of business solutions designed to scale your sales teams effortlessly.', 
            'MARKETING'
          ),
          (
            'crm_welcome_onboarding', 
            'Approved', 
            'TEXT', 
            'Hello {{1}},\n\nWelcome aboard! Your CRM workspace is now live and configured.\n\nFeel free to explore our real-time pipelines and let us know if you need a quick walkthrough.', 
            'UTILITY'
          ),
          (
            'crm_meeting_followup_reminder', 
            'Approved', 
            'TEXT', 
            'Hi {{1}},\n\nThis is a quick reminder regarding our scheduled discussion today at {{2}}.\n\nLooking forward to speaking with you!', 
            'UTILITY'
          );
      `);

      // 8. Seed Chat Messages for Dhaval Bodar matching Screenshot 5 ("hii", "hii", "133", "Aaa")
      if (dhavalId) {
        await c.query(`DELETE FROM wa_messages WHERE contact_id = $1`, [dhavalId]);
        await c.query(`
          INSERT INTO wa_messages (contact_id, sender, text, created_at)
          VALUES 
            ($1, 'agent', 'hii', '2026-08-25 12:53:00+05:30'),
            ($1, 'agent', 'hii', '2026-08-25 13:01:00+05:30'),
            ($1, 'contact', '133', '2026-08-25 13:01:10+05:30'),
            ($1, 'contact', 'Aaa', '2026-08-25 13:01:25+05:30');
        `, [dhavalId]);
      }

      // Seed chat messages for Sneha Ahir
      if (snehaId) {
        await c.query(`DELETE FROM wa_messages WHERE contact_id = $1`, [snehaId]);
        await c.query(`
          INSERT INTO wa_messages (contact_id, sender, text, created_at)
          VALUES 
            ($1, 'contact', 'Hello, please send quotation for CRM.', '2026-08-24 10:15:00+05:30'),
            ($1, 'agent', 'Sure Sneha, sharing details shortly!', '2026-08-24 10:18:00+05:30');
        `, [snehaId]);
      }

      console.log('Migrated & Seeded WA Daddy tables in ' + db);
      await c.end();
    } catch (e) {
      console.error(e);
    }
  }
}

migrateWaDaddy();

