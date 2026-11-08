// Ye script ek Demo Tenant Company aur uska Admin (Master) create karti hai
// Command: npx ts-node src/scripts/seed-tenant.ts

import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function seedTenant() {
  const masterPool = new Pool({
    host: process.env.MASTER_DB_HOST || 'localhost',
    port: parseInt(process.env.MASTER_DB_PORT || '5432', 10),
    database: process.env.MASTER_DB_NAME || 'crm_master',
    user: process.env.MASTER_DB_USER || 'postgres',
    password: process.env.MASTER_DB_PASSWORD || 'password',
  });

  const slug = 'apex';
  const dbName = 'crm_tenant_apex';
  const adminEmail = 'admin@apex.com';
  const adminPassword = 'Password123!';

  try {
    console.log('--- Setting up Demo Company: Apex Global ---');

    // 1. Check or Create Company in Master DB
    const existingCompany = await masterPool.query(
      `SELECT id FROM companies WHERE slug = $1`,
      [slug]
    );

    let companyId;
    if (existingCompany.rows.length === 0) {
      console.log('Creating company entry in crm_master...');
      const compRes = await masterPool.query(
        `INSERT INTO companies (name, slug, db_name, admin_name, admin_email, plan, is_active)
         VALUES ($1, $2, $3, $4, $5, 'active', true)
         RETURNING id`,
        ['Apex Global', slug, dbName, 'Master Admin', adminEmail]
      );
      companyId = compRes.rows[0].id;
    } else {
      companyId = existingCompany.rows[0].id;
      console.log('Company already exists in crm_master.');
    }

    // 2. Create Tenant Database if not exists
    console.log(`Checking if database "${dbName}" exists...`);
    const dbCheck = await masterPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (dbCheck.rows.length === 0) {
      console.log(`Creating database "${dbName}"...`);
      await masterPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }

    // 3. Connect to Tenant DB and apply Schema
    const tenantPool = new Pool({
      host: process.env.MASTER_DB_HOST || 'localhost',
      port: parseInt(process.env.MASTER_DB_PORT || '5432', 10),
      database: dbName,
      user: process.env.MASTER_DB_USER || 'postgres',
      password: process.env.MASTER_DB_PASSWORD || 'password',
    });

    try {
      console.log('Applying tenant schema to new database...');
      const schemaPath = path.join(process.cwd(), 'src', 'sql', 'tenant', '001_tenant_schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await tenantPool.query(schemaSql);

      // 4. Create Master Admin User inside Tenant DB
      const existingUser = await tenantPool.query(
        `SELECT id FROM users WHERE email = $1`,
        [adminEmail]
      );

      const passwordHash = await bcrypt.hash(adminPassword, 12);

      if (existingUser.rows.length === 0) {
        console.log('Creating Master Admin user in tenant database...');
        await tenantPool.query(
          `INSERT INTO users (name, email, password_hash, role, is_active)
           VALUES ($1, $2, $3, 'admin', true)`,
          ['Master Admin', adminEmail, passwordHash]
        );
      } else {
        console.log('Updating Master Admin password...');
        await tenantPool.query(
          `UPDATE users SET password_hash = $1 WHERE email = $2`,
          [passwordHash, adminEmail]
        );
      }

      console.log('\n=========================================');
      console.log('DEMO MASTER ADMIN SEED COMPLETED!');
      console.log('Company Slug : apex');
      console.log('Admin Email  : admin@apex.com');
      console.log('Password     : Password123!');
      console.log('Database     : crm_tenant_apex');
      console.log('=========================================\n');
    } finally {
      await tenantPool.end();
    }
  } catch (err: any) {
    console.error('Error during tenant seed:', err.message);
  } finally {
    await masterPool.end();
  }
}

seedTenant();

