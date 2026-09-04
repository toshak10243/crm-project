import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Ye service naya client database banati hai
// Jab Super Admin naya company create karta hai tab ye call hoti hai

@Injectable()
export class DbManagerService {
  // Master database ka pool — sirf DB create karne ke liye
  private masterPool: Pool;

  constructor() {
    this.masterPool = new Pool({
      host: process.env.MASTER_DB_HOST || 'localhost',
      port: parseInt(process.env.MASTER_DB_PORT, 10) || 5432,
      database: process.env.MASTER_DB_NAME || 'crm_master',
      user: process.env.MASTER_DB_USER || 'postgres',
      password: process.env.MASTER_DB_PASSWORD || 'password',
      max: 5,
    });
  }

  // Master pool return karo — super admin queries ke liye
  getMasterPool(): Pool {
    return this.masterPool;
  }

  // Naya tenant database banao aur tables provision karo
  async provisionClientDatabase(dbName: string): Promise<void> {
    // Step 1 — Database banao
    // Note: CREATE DATABASE transaction ke andar nahi hoti
    // Is liye directly masterPool se run karo
    await this.masterPool.query(
      `CREATE DATABASE "${dbName}"`
    );

    console.log(`Database created: ${dbName}`);

    // Step 2 — Naye database ka pool banao temporarily
    const clientPool = new Pool({
      host: process.env.MASTER_DB_HOST || 'localhost',
      port: parseInt(process.env.MASTER_DB_PORT, 10) || 5432,
      database: dbName,
      user: process.env.MASTER_DB_USER || 'postgres',
      password: process.env.MASTER_DB_PASSWORD || 'password',
      max: 2,
    });

    try {
      // Step 3 — SQL schema file padho aur run karo
      const schemaPath = path.join(
        process.cwd(),
        'src',
        'sql',
        'tenant',
        '001_tenant_schema.sql',
      );

      const schemaSql = fs.readFileSync(schemaPath, 'utf8');

      // Poora schema ek saath run karo
      await clientPool.query(schemaSql);

      console.log(`Schema provisioned for database: ${dbName}`);
    } finally {
      // Temporary pool band karo
      await clientPool.end();
    }
  }

  // Check karo ki database exist karta hai ya nahi
  async databaseExists(dbName: string): Promise<boolean> {
    const result = await this.masterPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    return result.rows.length > 0;
  }
}