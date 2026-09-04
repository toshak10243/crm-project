import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

// Har tenant ka alag pg connection pool yahan cache hota hai
@Injectable()
export class TenantPoolService implements OnModuleDestroy {
  private pools: Map<string, Pool> = new Map();

  getPool(dbName: string): Pool {
    if (this.pools.has(dbName)) {
      return this.pools.get(dbName) as Pool;
    }

    const pool = new Pool({
      host: process.env.MASTER_DB_HOST || 'localhost',
      port: parseInt(process.env.MASTER_DB_PORT || '5432', 10),
      database: dbName,
      user: process.env.MASTER_DB_USER || 'postgres',
      password: process.env.MASTER_DB_PASSWORD || 'password',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error(`Pool error for database ${dbName}:`, err);
    });

    this.pools.set(dbName, pool);
    return pool;
  }

  async onModuleDestroy() {
    for (const [dbName, pool] of this.pools) {
      await pool.end();
      console.log(`Pool closed for database: ${dbName}`);
    }
  }
}