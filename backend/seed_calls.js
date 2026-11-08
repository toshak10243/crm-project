const { Client } = require('pg');

async function seedCalls() {
  for (const db of ['crm_tenant_apex', 'crm_client_sharma_traders']) {
    try {
      const c = new Client({ connectionString: 'postgresql://postgres:Root%40123@localhost:5432/' + db });
      await c.connect();

      const leads = await c.query('SELECT id, name, phone FROM leads LIMIT 5');
      if (leads.rows.length > 0) {
        for (let i = 0; i < leads.rows.length; i++) {
          const l = leads.rows[i];
          const duration = 25 + (i * 45); // seconds
          await c.query(`
            INSERT INTO ivr_calls (call_type, caller, receiver, recording_url, call_duration, lead_id, lead_name, created_at)
            VALUES ('outgoing', '9825058424', $1, 'https://cts.myvi.in/recordings/sample_${i+1}.mp3', $2, $3, $4, NOW() - INTERVAL '${i * 3} hours')
          `, [l.phone || '91711445566', duration, l.id, l.name]);
        }
        console.log('Seeded sample IVR calls in ' + db);
      }
      await c.end();
    } catch (e) {
      console.error(e);
    }
  }
}
seedCalls();

