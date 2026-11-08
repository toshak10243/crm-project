const { Client } = require('pg');

async function test() {
  const c = new Client({ connectionString: 'postgresql://postgres:Root%40123@localhost:5432/crm_tenant_apex' });
  await c.connect();

  const sourcesRes = await c.query(`
    SELECT 
      COALESCE(NULLIF(l.lead_from, ''), 'Direct') AS name,
      COUNT(l.id) AS value
    FROM leads l
    WHERE 1=1
    GROUP BY COALESCE(NULLIF(l.lead_from, ''), 'Direct')
    ORDER BY value DESC
    LIMIT 6
  `);
  console.log('Sources test:', sourcesRes.rows);

  const funnelRes = await c.query(`
    SELECT 
      COALESCE(ls.name, 'Unassigned') AS stage,
      COALESCE(ls.color, '#64748b') AS color,
      COUNT(l.id) AS count
    FROM leads l
    LEFT JOIN lead_statuses ls ON ls.id = l.status_id
    WHERE 1=1
    GROUP BY COALESCE(ls.name, 'Unassigned'), COALESCE(ls.color, '#64748b'), ls.sort_order
    ORDER BY COALESCE(ls.sort_order, 99) ASC, count DESC
  `);
  console.log('Funnel test:', funnelRes.rows);

  await c.end();
}

test().catch(console.error);
