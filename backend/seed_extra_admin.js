const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function seed() {
  const hash1 = await bcrypt.hash('Chetana@12300', 10);
  const hash2 = await bcrypt.hash('Demo@12345', 10);
  for (const db of ['crm_tenant_apex', 'crm_client_sharma_traders']) {
    try {
      const client = new Client({ connectionString: 'postgresql://postgres:Root%40123@localhost:5432/' + db });
      await client.connect();

      await client.query(`
        INSERT INTO users (name, email, phone, role, password_hash, is_active, must_change_password)
        VALUES ('Chetana Dave', 'chetana@crm.com', '9825058424', 'extra_admin', '${hash1}', true, false)
        ON CONFLICT (email) DO UPDATE SET name = 'Chetana Dave', phone = '9825058424', role = 'extra_admin', password_hash = '${hash1}';
      `);

      await client.query(`
        INSERT INTO users (name, email, phone, role, password_hash, is_active, must_change_password)
        VALUES ('Demo', 'democrm@gmail.com', '9106364578', 'extra_admin', '${hash2}', true, false)
        ON CONFLICT (email) DO UPDATE SET name = 'Demo', phone = '9106364578', role = 'extra_admin', password_hash = '${hash2}';
      `);

      console.log('Seeded extra_admin in ' + db);
      await client.end();
    } catch (e) {
      console.error('Error in ' + db, e.message);
    }
  }
}
seed();
