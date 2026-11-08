const { Client } = require('pg');

async function check() {
  const c = new Client({ connectionString: 'postgresql://postgres:Root%40123@localhost:5432/crm_tenant_apex' });
  await c.connect();

  const leadsCount = await c.query('SELECT count(*) FROM leads');
  console.log('Total Leads in DB:', leadsCount.rows[0].count);

  const statusBreakdown = await c.query(`
    SELECT ls.name AS status_name, ls.color, count(l.id) AS count 
    FROM leads l
    LEFT JOIN lead_statuses ls ON ls.id = l.status_id
    GROUP BY ls.name, ls.color
    ORDER BY count DESC
  `);
  console.log('Status Breakdown:', statusBreakdown.rows);

  const sourceBreakdown = await c.query(`
    SELECT lead_from, count(*) AS count 
    FROM leads 
    GROUP BY lead_from 
    ORDER BY count DESC
  `);
  console.log('Source Breakdown:', sourceBreakdown.rows);

  const ivrCalls = await c.query(`
    SELECT call_type, count(*) AS count 
    FROM ivr_calls 
    GROUP BY call_type
  `);
  console.log('IVR Calls:', ivrCalls.rows);

  const todayFollowups = await c.query(`
    SELECT count(*) FROM leads 
    WHERE DATE(next_followup_date) = CURRENT_DATE
  `);
  console.log('Today Followups:', todayFollowups.rows[0].count);

  const todayBirthdays = await c.query(`
    SELECT count(*) FROM leads 
    WHERE EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) 
      AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
  `);
  console.log('Today Birthdays:', todayBirthdays.rows[0].count);

  await c.end();
}

check().catch(console.error);
