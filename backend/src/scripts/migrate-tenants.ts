// Ye script saare existing client databases mein schema changes / new tables automatically sync karti hai
// Command: pnpm run migrate:tenants

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrateAllTenants() {
  const masterPool = new Pool({
    host: process.env.MASTER_DB_HOST || 'localhost',
    port: parseInt(process.env.MASTER_DB_PORT || '5432', 10),
    database: process.env.MASTER_DB_NAME || 'crm_master',
    user: process.env.MASTER_DB_USER || 'postgres',
    password: process.env.MASTER_DB_PASSWORD || 'password',
  });

  try {
    console.log('Fetching active client databases from crm_master...');
    const res = await masterPool.query(`SELECT id, name, slug, db_name FROM companies WHERE status != 'deleted'`);
    const companies = res.rows;

    console.log(`Found ${companies.length} company databases to migrate.`);

    const tenantSchemaPath = path.join(
      process.cwd(),
      'src',
      'sql',
      'tenant',
      '001_tenant_schema.sql',
    );
    const tenantSql = fs.readFileSync(tenantSchemaPath, 'utf8');

    for (const company of companies) {
      console.log(`Migrating database for: ${company.name} (${company.db_name})...`);
      const clientPool = new Pool({
        host: process.env.MASTER_DB_HOST || 'localhost',
        port: parseInt(process.env.MASTER_DB_PORT || '5432', 10),
        database: company.db_name,
        user: process.env.MASTER_DB_USER || 'postgres',
        password: process.env.MASTER_DB_PASSWORD || 'password',
        max: 2,
      });

      try {
        await clientPool.query(tenantSql);
        console.log(` Successfully synced schema for ${company.db_name}`);
      } catch (clientErr: any) {
        console.error(`❌ Failed migrating ${company.db_name}:`, clientErr.message);
      } finally {
        await clientPool.end();
      }
    }

    console.log('All tenant database migrations completed successfully!');
  } catch (err: any) {
    console.error('Migration process failed:', err.message);
    process.exit(1);
  } finally {
    await masterPool.end();
  }
}

migrateAllTenants();

