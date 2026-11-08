const { Client } = require('pg');

async function seed() {
  for (const db of ['crm_tenant_apex', 'crm_client_sharma_traders']) {
    try {
      const c = new Client({ connectionString: 'postgresql://postgres:Root%40123@localhost:5432/' + db });
      await c.connect();

      // Ensure manager Toshak Sharma exists
      const mgrRes = await c.query("SELECT id FROM users WHERE role IN ('manager', 'admin') LIMIT 1");
      if (mgrRes.rows.length > 0) {
        const mgrId = mgrRes.rows[0].id;
        // Assign all leads without manager to this manager
        await c.query(`UPDATE leads SET assigned_to = $1 WHERE assigned_to IS NULL`, [mgrId]);
        console.log(`Assigned leads to manager ${mgrId} in ${db}`);
      }
      await c.end();
    } catch (e) {
      console.error(e);
    }
  }
}

seed();

