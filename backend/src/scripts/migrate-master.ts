// Ye script crm_master database mein tables banati hai
// Pehli baar setup ke waqt run karo
// Command: pnpm run migrate:master

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrateMaster() {
  const pool = new Pool({
    host: process.env.MASTER_DB_HOST || 'localhost',
    port: parseInt(process.env.MASTER_DB_PORT || '5432', 10),
    database: process.env.MASTER_DB_NAME || 'crm_master',
    user: process.env.MASTER_DB_USER || 'postgres',
    password: process.env.MASTER_DB_PASSWORD || 'password',
  });

  try {
    console.log('Connecting to crm_master...');

    // SQL file path
    const sqlPath = path.join(
      process.cwd(),
      'src',
      'sql',
      'master',
      '001_master_schema.sql',
    );

    // SQL file padho
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running master schema migration...');
    await pool.query(sql);

    console.log('Master migration completed successfully!');
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateMaster();