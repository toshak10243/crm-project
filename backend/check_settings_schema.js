const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://postgres:Root%40123@localhost:5432/crm_tenant_apex' });
  await c.connect();
  for (const table of ['lead_statuses', 'lead_sources', 'templates', 'settings']) {
    const cols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [table]);
    console.log('TABLE ' + table + ':', cols.rows.map(r => r.column_name + '(' + r.data_type + ')'));
    const data = await c.query('SELECT * FROM ' + table + ' LIMIT 5');
    console.log('DATA ' + table + ':', data.rows);
  }
  await c.end();
}
run().catch(console.error);

