// Ye script pehli baar run hoti hai -- Super Admin account banane ke liye
// Command: npx ts-node src/scripts/seed-super-admin.ts

import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function seedSuperAdmin() {
  const pool = new Pool({
    host: process.env.MASTER_DB_HOST || 'localhost',
    port: parseInt(process.env.MASTER_DB_PORT || '5432', 10),
    database: process.env.MASTER_DB_NAME || 'crm_master',
    user: process.env.MASTER_DB_USER || 'postgres',
    password: process.env.MASTER_DB_PASSWORD || 'password',
  });

  try {
    console.log('Connecting to crm_master database...');

    // Check karo already exist karta hai kya
    const existing = await pool.query(
      `SELECT id FROM super_admins WHERE email = $1`,
      [process.env.SUPER_ADMIN_EMAIL],
    );

    if (existing.rows.length > 0) {
      console.log('Super Admin already exists -- skipping seed');
      return;
    }

    // Password .env se lo -- agar nahi hai to process band karo
    const password = process.env.SUPER_ADMIN_PASSWORD;
    if (!password) {
      console.error('SUPER_ADMIN_PASSWORD not set in .env -- aborting');
      process.exit(1);
    }

    // Password hash karo
    const passwordHash = await bcrypt.hash(password, 12);

    // Super Admin insert karo
    const result = await pool.query(
      `INSERT INTO super_admins (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      ['Super Admin', process.env.SUPER_ADMIN_EMAIL, passwordHash],
    );

    console.log('Super Admin created successfully!');
    console.log(`Email: ${result.rows[0].email}`);
    console.log(`ID: ${result.rows[0].id}`);
    // Production mein password console pe nahi dikhate
  } catch (error: any) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedSuperAdmin();