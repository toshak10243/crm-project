const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function restore() {
  const adminPass = await bcrypt.hash('Admin@123', 10);
  const salesPass = await bcrypt.hash('Sales@123', 10);

  // 1. Restore into crm_tenant_apex
  const clientApex = new Client({ connectionString: 'postgresql://postgres:Root%40123@localhost:5432/crm_tenant_apex' });
  await clientApex.connect();
  
  await clientApex.query(`
    INSERT INTO users (name, email, password_hash, role, is_active, must_change_password)
    VALUES ('Master Admin', 'admin@apex.com', '${adminPass}', 'admin', true, false)
    ON CONFLICT (email) DO UPDATE SET password_hash = '${adminPass}', is_active = true, role = 'admin';
  `);

  await clientApex.query(`
    INSERT INTO users (name, email, password_hash, role, is_active, must_change_password)
    VALUES ('Burhan Ezzy', 'burhan@apex.com', '${salesPass}', 'sales_executive', true, false)
    ON CONFLICT (email) DO UPDATE SET password_hash = '${salesPass}', is_active = true;
  `);

  console.log('Restored users in crm_tenant_apex');
  await clientApex.end();

  // 2. Activate Sharma traders in master DB
  const master = new Client({ connectionString: 'postgresql://postgres:Root%40123@localhost:5432/crm_master' });
  await master.connect();
  await master.query(`UPDATE companies SET is_active = true WHERE slug = 'sharma-traders'`);
  console.log('Activated sharma-traders in crm_master');
  await master.end();

  // 3. Ensure Ramesh Sharma password is known
  const clientSharma = new Client({ connectionString: 'postgresql://postgres:Root%40123@localhost:5432/crm_client_sharma_traders' });
  await clientSharma.connect();
  await clientSharma.query(`
    UPDATE users SET password_hash = '${adminPass}', is_active = true WHERE email = 'toshak1292@gmail.com';
  `);
  console.log('Updated toshak1292@gmail.com password in crm_client_sharma_traders');
  await clientSharma.end();
}

restore().catch(console.error);

