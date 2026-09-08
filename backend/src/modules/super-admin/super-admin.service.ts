// Super Admin ki saari business logic yahan hai
// Company create, activate/deactivate, subscription management

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DbManagerService } from '../../database/db-manager.service';
import { TenantPoolService } from '../../database/tenant-pool.service';
import { MailService } from '../../common/services/mail.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { SuperAdminLoginDto } from './dto/login.dto';
import { InvoiceService } from '../../common/services/invoice.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Pool } from 'pg';

@Injectable()
export class SuperAdminService {
constructor(
  private dbManager: DbManagerService,
  private tenantPoolService: TenantPoolService,
  private configService: ConfigService,
  private mailService: MailService,
  private invoiceService: InvoiceService,
) {}

  // Super Admin login -- email, phone, ya username se
async login(dto: SuperAdminLoginDto) {
  const pool = this.dbManager.getMasterPool();

  const result = await pool.query(
    `SELECT * FROM super_admins 
     WHERE (email = $1 OR phone = $1 OR username = $1) 
     AND is_active = true`,
    [dto.identifier],
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const superAdmin = result.rows[0];

  const isPasswordValid = await bcrypt.compare(
    dto.password,
    superAdmin.password_hash,
  );

  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const tokens = await this.generateTokens(superAdmin.id, superAdmin.email);

  // Login history record karo
  await this.recordLoginHistory({
    superAdminId: superAdmin.id,
    status: 'success',
  });

  return {
    user: {
      id: superAdmin.id,
      name: superAdmin.name,
      email: superAdmin.email,
      phone: superAdmin.phone,
      username: superAdmin.username,
    },
    ...tokens,
  };
}

  // Token refresh
  async refreshToken(refreshToken: string) {
    const pool = this.dbManager.getMasterPool();

    try {
      const secret = this.configService.get<string>('jwt.refreshSecret');
      const payload = jwt.verify(refreshToken, secret) as any;

      if (payload.type !== 'super_admin_refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      const tokenResult = await pool.query(
        `SELECT * FROM super_admin_tokens 
         WHERE super_admin_id = $1 
         AND token_hash = $2 
         AND expires_at > NOW()`,
        [payload.sub, tokenHash],
      );

      if (tokenResult.rows.length === 0) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Old token delete karo -- one time use
      await pool.query(
        `DELETE FROM super_admin_tokens WHERE token_hash = $1`,
        [tokenHash],
      );

      const adminResult = await pool.query(
        `SELECT * FROM super_admins WHERE id = $1 AND is_active = true`,
        [payload.sub],
      );

      if (adminResult.rows.length === 0) {
        throw new UnauthorizedException('Super Admin not found or inactive');
      }

      const tokens = await this.generateTokens(
        adminResult.rows[0].id,
        adminResult.rows[0].email,
      );

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // Naya company create karo + 7 day trial + email
  async createCompany(dto: CreateCompanyDto, superAdminId: string, ipAddress?: string) {
    const pool = this.dbManager.getMasterPool();

    // Slug ya email already exist karta hai check karo
    const existing = await pool.query(
      `SELECT id FROM companies WHERE slug = $1 OR admin_email = $2`,
      [dto.slug, dto.adminEmail],
    );

    if (existing.rows.length > 0) {
      throw new ConflictException(
        'Company with this slug or email already exists',
      );
    }

    const dbName = `crm_client_${dto.slug.replace(/-/g, '_')}`;

    const dbExists = await this.dbManager.databaseExists(dbName);
    if (dbExists) {
      throw new ConflictException('Database already exists for this slug');
    }

    try {
      // Step 1 -- Naya database banao aur tables provision karo
      await this.dbManager.provisionClientDatabase(dbName);

      // Step 2 -- Temp password generate karo
      const tempPassword = this.generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      // Step 3 -- Admin user us database mein banao
      const tempPool = new Pool({
        host: process.env.MASTER_DB_HOST || 'localhost',
        port: parseInt(process.env.MASTER_DB_PORT || '5432', 10),
        database: dbName,
        user: process.env.MASTER_DB_USER || 'postgres',
        password: process.env.MASTER_DB_PASSWORD || 'password',
        max: 2,
      });

      await tempPool.query(
        `INSERT INTO users (name, email, password_hash, role, must_change_password)
         VALUES ($1, $2, $3, 'admin', true)`,
        [dto.adminName, dto.adminEmail, passwordHash],
      );

      await tempPool.end();

      // Step 4 -- 7 days trial end date
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      // Step 5 -- Master DB mein company record banao
      const companyResult = await pool.query(
        `INSERT INTO companies 
         (name, slug, admin_name, admin_email, db_name, phone, address,
          plan, trial_ends_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'trial', $8, $9)
         RETURNING *`,
        [
          dto.name,
          dto.slug,
          dto.adminName,
          dto.adminEmail,
          dbName,
          dto.phone || null,
          dto.address || null,
          trialEndsAt,
          superAdminId,
        ],
      );

      // Step 6 -- Trial welcome email bhejo
      const loginUrl =
        this.configService.get<string>('frontend.url') + '/login';

      await this.mailService.sendTrialWelcomeEmail(
        dto.adminEmail,
        dto.adminName,
        dto.name,
        tempPassword,
        loginUrl,
        trialEndsAt,
      );

      await this.createAuditLog({
        action: 'CREATED_COMPANY',
        entityType: 'company',
        entityId: companyResult.rows[0].id,
        entityName: dto.name,
        details: { slug: dto.slug, adminEmail: dto.adminEmail },
        performedBy: superAdminId,
        ipAddress: ipAddress,
      });

      return {
        company: companyResult.rows[0],
        message: `Company created. 7-day trial started. Credentials sent to ${dto.adminEmail}`,
      };
    } catch (error: any) {
      console.error('Company creation failed:', error);
      throw new InternalServerErrorException(
        'Failed to create company. Please try again.',
      );
    }
  }

  // Saari companies list -- filters ke saath
  async getAllCompanies(
    page: number = 1,
    limit: number = 20,
    search?: string,
    plan?: string,
  ) {
    const pool = this.dbManager.getMasterPool();
    const offset = (page - 1) * limit;
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      conditions.push(
        `(name ILIKE $${paramCount} OR admin_email ILIKE $${paramCount} OR slug ILIKE $${paramCount})`,
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    if (plan) {
      conditions.push(`plan = $${paramCount}`);
      params.push(plan);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM companies WHERE ${whereClause}`,
      params,
    );

    const result = await pool.query(
      `SELECT id, name, slug, admin_name, admin_email, phone,
              plan, trial_ends_at, subscription_start_at,
              subscription_ends_at, subscription_plan,
              is_active, activated_at, created_at
       FROM companies
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset],
    );

    const total = parseInt(countResult.rows[0].count, 10);

    return {
      data: result.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Single company detail
  async getCompanyById(companyId: string) {
    const pool = this.dbManager.getMasterPool();

    const result = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM payment_requests pr WHERE pr.company_id = c.id) as total_payment_requests,
              (SELECT COUNT(*) FROM payment_requests pr WHERE pr.company_id = c.id AND pr.status = 'pending') as pending_payments
       FROM companies c
       WHERE c.id = $1`,
      [companyId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Company not found');
    }

    return result.rows[0];
  }

  // Company activate karo
  async activateCompany(companyId: string, superAdminId?: string, ipAddress?: string) {
    const pool = this.dbManager.getMasterPool();

    const result = await pool.query(
      `UPDATE companies 
       SET is_active = true, activated_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [companyId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Company not found');
    }

    await this.createAuditLog({
      action: 'ACTIVATED_COMPANY',
      entityType: 'company',
      entityId: companyId,
      entityName: result.rows[0].name,
      details: {
        plan: result.rows[0].plan || 'N/A',
        adminEmail: result.rows[0].admin_email || 'N/A',
      },
      performedBy: superAdminId,
      ipAddress: ipAddress,
    });

    return result.rows[0];
  }

  // Company deactivate karo
  async deactivateCompany(companyId: string, superAdminId?: string, ipAddress?: string) {
    const pool = this.dbManager.getMasterPool();

    const result = await pool.query(
      `UPDATE companies 
       SET is_active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [companyId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Company not found');
    }

    await this.createAuditLog({
      action: 'DEACTIVATED_COMPANY',
      entityType: 'company',
      entityId: companyId,
      entityName: result.rows[0].name,
      details: {
        plan: result.rows[0].plan || 'N/A',
        adminEmail: result.rows[0].admin_email || 'N/A',
      },
      performedBy: superAdminId,
      ipAddress: ipAddress,
    });

    return result.rows[0];
  }

  //delete compney
  async deleteCompany(companyId: string, superAdminId?: string, ipAddress?: string) {
  const pool = this.dbManager.getMasterPool();

  // 1. Company find karo
  const companyResult = await pool.query(
    `
    SELECT id, name, slug, db_name
    FROM companies
    WHERE id = $1
    `,
    [companyId],
  );

  if (companyResult.rows.length === 0) {
    throw new NotFoundException('Company not found');
  }

  const company = companyResult.rows[0];

  // Safety check — sirf hamare tenant DB names allow hon
  if (!/^crm_client_[a-z0-9_]+$/.test(company.db_name)) {
    throw new BadRequestException('Invalid company database configuration');
  }

  try {
    // 2. Cached tenant pool close karo
    await this.tenantPoolService.closePool(company.db_name);

    // 3. Tenant database permanently delete karo
    await this.dbManager.deleteClientDatabase(company.db_name);

    // 4. Master DB ke invoice PDF paths pehle nikaal lo
    const invoiceResult = await pool.query(
      `
      SELECT pdf_path
      FROM invoices
      WHERE company_id = $1
        AND pdf_path IS NOT NULL
      `,
      [companyId],
    );

    // 5. Master company delete karo
    //
    // Current schema mein:
    // payment_requests.company_id -> companies ON DELETE CASCADE
    // invoices.company_id -> companies ON DELETE CASCADE
    //
    // Isliye dono records automatically delete honge.
    await pool.query(
      `DELETE FROM companies WHERE id = $1`,
      [companyId],
    );

    await this.createAuditLog({
      action: 'DELETED_COMPANY',
      entityType: 'company',
      entityId: companyId,
      entityName: company.name,
      details: {
        slug: company.slug || 'N/A',
        dbName: company.db_name || 'N/A',
      },
      performedBy: superAdminId,
      ipAddress: ipAddress,
    });

    // 6. Company ke invoice PDFs bhi delete karo
    for (const row of invoiceResult.rows) {
      if (!row.pdf_path) continue;

      try {
        const fs = await import('fs/promises');

        await fs.unlink(row.pdf_path);
      } catch (error) {
        // File already missing hai to company deletion fail mat karo
        console.warn(
          `Could not delete invoice PDF: ${row.pdf_path}`,
        );
      }
    }

    return {
      deleted: true,
      companyId: company.id,
      companyName: company.name,
      message: `${company.name} and all associated data were permanently deleted`,
    };
  } catch (error) {
    console.error(
      `Failed to delete company ${company.id}:`,
      error,
    );

    throw new InternalServerErrorException(
      'Failed to permanently delete company',
    );
  }
}

  // Payment verify karo aur subscription activate karo
  async verifyPayment(
    companyId: string,
    superAdminId: string,
    data: {
      paymentRequestId: string;
      plan: string;
      amount: number;
      notes?: string;
    },
    ipAddress?: string,
  ) {
    const pool = this.dbManager.getMasterPool();

    // Company dhundo
    const companyResult = await pool.query(
      `SELECT * FROM companies WHERE id = $1`,
      [companyId],
    );

    if (companyResult.rows.length === 0) {
      throw new NotFoundException('Company not found');
    }

    const company = companyResult.rows[0];

    // Subscription end date calculate karo
    const subscriptionStartAt = new Date();
    const subscriptionEndsAt = new Date();

    if (data.plan === '1year') {
      subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1);
    } else if (data.plan === '6months') {
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 6);
    } else if (data.plan === '3months') {
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 3);
    } else if (data.plan === '1month') {
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
    }

    // Company subscription update karo
    await pool.query(
      `UPDATE companies 
       SET plan = 'active',
           is_active = true,
           subscription_start_at = $1,
           subscription_ends_at = $2,
           subscription_plan = $3,
           subscription_amount = $4,
           payment_verified_at = NOW(),
           payment_verified_by = $5,
           payment_notes = $6,
           updated_at = NOW()
       WHERE id = $7`,
      [
        subscriptionStartAt,
        subscriptionEndsAt,
        data.plan,
        data.amount,
        superAdminId,
        data.notes || null,
        companyId,
      ],
    );

    // Payment request status update karo
    if (data.paymentRequestId) {
      await pool.query(
        `UPDATE payment_requests 
         SET status = 'verified', verified_by = $1, verified_at = NOW()
         WHERE id = $2`,
        [superAdminId, data.paymentRequestId],
      );
    }

    // Subscription activated email bhejo
    const planLabels: Record<string, string> = {
      '1year': '1 Year Plan',
      '6months': '6 Months Plan',
      '3months': '3 Months Plan',
      '1month': '1 Month Plan',
    };

    await this.mailService.sendSubscriptionActivatedEmail(
      company.admin_email,
      company.admin_name,
      company.name,
      planLabels[data.plan] || data.plan,
      subscriptionEndsAt,
      data.amount,
    );

    // Invoice generate karo aur email bhejo
    await this.invoiceService.createAndSendInvoice({
      companyId,
      companyName: company.name,
      adminName: company.admin_name,
      adminEmail: company.admin_email,
      plan: data.plan,
      amount: data.amount,
      paymentMode: company.payment_mode || undefined,
      referenceNo: company.payment_reference || undefined,
      notes: data.notes,
      subscriptionFrom: subscriptionStartAt,
      subscriptionTo: subscriptionEndsAt,
      superAdminId,
    });

    await this.createAuditLog({
      action: 'ACTIVATED_SUBSCRIPTION',
      entityType: 'company',
      entityId: companyId,
      entityName: company.name,
      details: { plan: data.plan, amount: data.amount },
      performedBy: superAdminId,
      ipAddress: ipAddress,
    });

    return {
      message: 'Payment verified and subscription activated successfully',
      subscriptionEndsAt,
    };
  }

  // Payment request reject karo
  async rejectPayment(
    paymentRequestId: string,
    superAdminId: string,
    reason: string,
    ipAddress?: string,
  ) {
    const pool = this.dbManager.getMasterPool();

    const result = await pool.query(
      `UPDATE payment_requests 
       SET status = 'rejected', 
           verified_by = $1, 
           verified_at = NOW(),
           rejection_reason = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [superAdminId, reason, paymentRequestId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Payment request not found');
    }

    await this.createAuditLog({
      action: 'REJECTED_PAYMENT',
      entityType: 'payment',
      entityId: paymentRequestId,
      entityName: result.rows[0].company_name || '',
      details: { reason },
      performedBy: superAdminId,
      ipAddress: ipAddress,
    });

    return result.rows[0];
  }

  // Saare pending payment requests
  async getPendingPayments(page: number = 1, limit: number = 20) {
    const pool = this.dbManager.getMasterPool();
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM payment_requests WHERE status = 'pending'`,
    );

    const result = await pool.query(
      `SELECT pr.*, c.name as company_name, c.admin_email, c.admin_name, c.plan as current_plan
       FROM payment_requests pr
       JOIN companies c ON c.id = pr.company_id
       WHERE pr.status = 'pending'
       ORDER BY pr.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const total = parseInt(countResult.rows[0].count, 10);

    return {
      data: result.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Super Admin dashboard stats
  async getDashboardStats() {
    const pool = this.dbManager.getMasterPool();

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE plan = 'trial' AND is_active = true) as active_trials,
        COUNT(*) FILTER (WHERE plan = 'active' AND is_active = true) as active_subscriptions,
        COUNT(*) FILTER (WHERE plan = 'expired') as expired,
        COUNT(*) FILTER (WHERE plan = 'suspended') as suspended,
        COUNT(*) as total_companies,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month,
        COUNT(*) FILTER (WHERE trial_ends_at::date = (NOW() + INTERVAL '2 days')::date AND plan = 'trial') as trials_ending_in_2days,
        COUNT(*) FILTER (WHERE subscription_ends_at::date <= (NOW() + INTERVAL '7 days')::date AND plan = 'active') as subscriptions_expiring_soon
      FROM companies
    `);

    const pendingPayments = await pool.query(
      `SELECT COUNT(*) FROM payment_requests WHERE status = 'pending'`,
    );

    return {
      ...result.rows[0],
      pending_payments: parseInt(pendingPayments.rows[0].count, 10),
    };
  }

  // Expiring companies list
async getExpiringCompanies() {
  const pool = this.dbManager.getMasterPool();

  const result = await pool.query(`
    SELECT 
      id, name, slug, plan,
      admin_email, admin_name,
      CASE 
        WHEN plan = 'trial' THEN trial_ends_at
        ELSE subscription_ends_at
      END as expiry_date,
      CASE 
        WHEN plan = 'trial' THEN EXTRACT(DAY FROM trial_ends_at - NOW())
        ELSE EXTRACT(DAY FROM subscription_ends_at - NOW())
      END as days_remaining
    FROM companies
    WHERE is_active = true
      AND (
        (plan = 'trial' AND trial_ends_at IS NOT NULL AND trial_ends_at > NOW())
        OR
        (plan = 'active' AND subscription_ends_at IS NOT NULL AND subscription_ends_at > NOW())
      )
    ORDER BY days_remaining ASC
    LIMIT 20
  `);

  return result.rows.map(r => ({
    ...r,
    days_remaining: Math.ceil(Number(r.days_remaining)),
  }));
}

  // JWT tokens generate karo
  private async generateTokens(superAdminId: string, email: string) {
    const pool = this.dbManager.getMasterPool();
    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');

    const accessToken = jwt.sign(
      { sub: superAdminId, email, type: 'super_admin' },
      accessSecret,
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign(
      { sub: superAdminId, email, type: 'super_admin_refresh' },
      refreshSecret,
      { expiresIn: '30d' },
    );

    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await pool.query(
      `INSERT INTO super_admin_tokens (super_admin_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [superAdminId, tokenHash],
    );

    return { accessToken, refreshToken };
  }

  // Random temp password generate karo
  private generateTempPassword(): string {
    const chars =
      'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  // Company ke users fetch karo -- tenant DB se
async getCompanyUsers(companyId: string) {
  const pool = this.dbManager.getMasterPool();

  // Company dhundo
  const companyResult = await pool.query(
    `SELECT slug FROM companies WHERE id = $1`,
    [companyId],
  );
  if (companyResult.rows.length === 0) {
    throw new NotFoundException('Company not found');
  }

  const slug = companyResult.rows[0].slug;
  const tenantPool = new (require('pg').Pool)({
  host: process.env.MASTER_DB_HOST || 'localhost',
  port: parseInt(process.env.MASTER_DB_PORT, 10) || 5432,
  database: `crm_client_${slug.replace(/-/g, '_')}`,
  user: process.env.MASTER_DB_USER || 'postgres',
  password: process.env.MASTER_DB_PASSWORD || 'password',
  max: 3,
});

  // Users fetch karo tenant DB se
  const usersResult = await tenantPool.query(
    `SELECT id, name, email, phone, role, is_active, 
            last_login_at, created_at,
            department_id
     FROM users 
     ORDER BY role ASC, name ASC`,
  );

  // Role wise group karo
  const grouped = {
    admin: usersResult.rows.filter(u => u.role === 'admin'),
    manager: usersResult.rows.filter(u => u.role === 'manager'),
    agent: usersResult.rows.filter(u => u.role === 'agent'),
    total: usersResult.rows.length,
  };

  return grouped;
}

// Company usage stats -- tenant DB se
async getCompanyUsage(companyId: string) {
  const pool = this.dbManager.getMasterPool();

  const companyResult = await pool.query(
    `SELECT slug FROM companies WHERE id = $1`,
    [companyId],
  );
  if (companyResult.rows.length === 0) {
    throw new NotFoundException('Company not found');
  }

  const slug = companyResult.rows[0].slug;
  const dbName = `crm_client_${slug.replace(/-/g, '_')}`;
  const tenantPool = new (require('pg').Pool)({
  host: process.env.MASTER_DB_HOST || 'localhost',
  port: parseInt(process.env.MASTER_DB_PORT, 10) || 5432,
  database: `crm_client_${slug.replace(/-/g, '_')}`,
  user: process.env.MASTER_DB_USER || 'postgres',
  password: process.env.MASTER_DB_PASSWORD || 'password',
  max: 3,
});

  // Parallel queries
  const [
    usersResult,
    leadsResult,
    clientsResult,
    quotationsResult,
    dealsResult,
    invoicesResult,
    dbSizeResult,
    lastActivityResult,
  ] = await Promise.all([
    tenantPool.query(`SELECT COUNT(*) FROM users`),
    tenantPool.query(`SELECT COUNT(*) FROM leads`).catch(() => ({ rows: [{ count: 0 }] })),
    tenantPool.query(`SELECT COUNT(*) FROM clients`).catch(() => ({ rows: [{ count: 0 }] })),
    tenantPool.query(`SELECT COUNT(*) FROM quotations`).catch(() => ({ rows: [{ count: 0 }] })),
    tenantPool.query(`SELECT COUNT(*) FROM deals`).catch(() => ({ rows: [{ count: 0 }] })),
    tenantPool.query(`SELECT COUNT(*) FROM invoices`).catch(() => ({ rows: [{ count: 0 }] })),
    pool.query(`SELECT pg_size_pretty(pg_database_size($1)) as size, pg_database_size($1) as bytes`, [dbName]),
    tenantPool.query(`SELECT MAX(last_login_at) as last_activity FROM users WHERE last_login_at IS NOT NULL`).catch(() => ({ rows: [{ last_activity: null }] })),
  ]);

  return {
    users: parseInt(usersResult.rows[0].count, 10),
    leads: parseInt(leadsResult.rows[0].count, 10),
    clients: parseInt(clientsResult.rows[0].count, 10),
    quotations: parseInt(quotationsResult.rows[0].count, 10),
    deals: parseInt(dealsResult.rows[0].count, 10),
    invoices: parseInt(invoicesResult.rows[0].count, 10),
    dbName,
    dbSize: dbSizeResult.rows[0]?.size || '0 MB',
    dbSizeBytes: parseInt(dbSizeResult.rows[0]?.bytes || '0', 10),
    lastActivity: lastActivityResult.rows[0]?.last_activity || null,
  };
}

// User disable/enable karo -- tenant DB mein
async toggleCompanyUser(companyId: string, userId: string, isActive: boolean) {
  const pool = this.dbManager.getMasterPool();

  const companyResult = await pool.query(
    `SELECT slug FROM companies WHERE id = $1`,
    [companyId],
  );
  if (companyResult.rows.length === 0) {
    throw new NotFoundException('Company not found');
  }

  const slug = companyResult.rows[0].slug;
  const tenantPool = new (require('pg').Pool)({
  host: process.env.MASTER_DB_HOST || 'localhost',
  port: parseInt(process.env.MASTER_DB_PORT, 10) || 5432,
  database: `crm_client_${slug.replace(/-/g, '_')}`,
  user: process.env.MASTER_DB_USER || 'postgres',
  password: process.env.MASTER_DB_PASSWORD || 'password',
  max: 3,
});

  await tenantPool.query(
    `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2`,
    [isActive, userId],
  );

  return { message: `User ${isActive ? 'activated' : 'deactivated'} successfully` };
}

// Force password reset -- email bhejo user ko
async forcePasswordReset(companyId: string, userId: string) {
  const pool = this.dbManager.getMasterPool();

  const companyResult = await pool.query(
    `SELECT slug, name FROM companies WHERE id = $1`,
    [companyId],
  );
  if (companyResult.rows.length === 0) {
    throw new NotFoundException('Company not found');
  }

  const slug = companyResult.rows[0].slug;
  const tenantPool = new (require('pg').Pool)({
  host: process.env.MASTER_DB_HOST || 'localhost',
  port: parseInt(process.env.MASTER_DB_PORT, 10) || 5432,
  database: `crm_client_${slug.replace(/-/g, '_')}`,
  user: process.env.MASTER_DB_USER || 'postgres',
  password: process.env.MASTER_DB_PASSWORD || 'password',
  max: 3,
});

  // User dhundo
  const userResult = await tenantPool.query(
    `SELECT * FROM users WHERE id = $1`,
    [userId],
  );
  if (userResult.rows.length === 0) {
    throw new NotFoundException('User not found');
  }

  const user = userResult.rows[0];

  // Temp password generate karo
  const tempPassword = `Reset@${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  // Password update karo
  await tenantPool.query(
    `UPDATE users SET password_hash = $1, must_change_password = true, updated_at = NOW() WHERE id = $2`,
    [hashedPassword, userId],
  );

  // Email bhejo user ko
  await this.mailService.sendPasswordResetByAdminEmail(
    user.email,
    user.name,
    tempPassword,
    companyResult.rows[0].name,
  );

  return { message: 'Password reset email sent to user' };
}

// Dashboard mein company health
async getCompanyHealthStats() {
  const pool = this.dbManager.getMasterPool();

  const companiesResult = await pool.query(
    `SELECT id, name, slug, plan, is_active, updated_at FROM companies WHERE is_active = true`,
  );

  const now = new Date();
  let healthy = 0;
  let lowActivity = 0;
  let inactive = 0;

  for (const company of companiesResult.rows) {
    try {
      const tenantPool = new (require('pg').Pool)({
  host: process.env.MASTER_DB_HOST || 'localhost',
  port: parseInt(process.env.MASTER_DB_PORT, 10) || 5432,
  database: `crm_client_${company.slug.replace(/-/g, '_')}`,
  user: process.env.MASTER_DB_USER || 'postgres',
  password: process.env.MASTER_DB_PASSWORD || 'password',
  max: 2,
});
      const result = await tenantPool.query(
        `SELECT MAX(last_login_at) as last_activity FROM users`,
      ).catch(() => ({ rows: [{ last_activity: null }] }));

      const lastActivity = result.rows[0]?.last_activity;
      if (!lastActivity) {
        inactive++;
        continue;
      }

      const daysSinceActivity = Math.floor(
        (now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceActivity <= 7) healthy++;
      else if (daysSinceActivity <= 30) lowActivity++;
      else inactive++;
    } catch {
      inactive++;
    }
  }

  return { healthy, lowActivity, inactive };
}
// Email templates fetch karo
async getEmailTemplates() {
  const pool = this.dbManager.getMasterPool();
  const result = await pool.query(
    `SELECT * FROM email_templates ORDER BY type, name`
  );
  return result.rows;
}

// WhatsApp templates fetch karo
async getWhatsappTemplates() {
  const pool = this.dbManager.getMasterPool();
  const result = await pool.query(
    `SELECT * FROM whatsapp_templates ORDER BY name`
  );
  return result.rows;
}

// Email template update karo
async updateEmailTemplate(key: string, data: { subject?: string; body?: string }) {
  const pool = this.dbManager.getMasterPool();
  await pool.query(
    `UPDATE email_templates 
     SET subject = COALESCE($1, subject),
         body = COALESCE($2, body),
         updated_at = NOW()
     WHERE key = $3`,
    [data.subject || null, data.body || null, key]
  );
  const result = await pool.query(
    `SELECT * FROM email_templates WHERE key = $1`, [key]
  );
  return result.rows[0];
}

// WhatsApp template update karo
async updateWhatsappTemplate(key: string, data: { body: string }) {
  const pool = this.dbManager.getMasterPool();
  await pool.query(
    `UPDATE whatsapp_templates 
     SET body = $1, updated_at = NOW()
     WHERE key = $2`,
    [data.body, key]
  );
  const result = await pool.query(
    `SELECT * FROM whatsapp_templates WHERE key = $1`, [key]
  );
  return result.rows[0];
}
// Company ka data template ke liye
async getCompanyTemplateData(companyId: string) {
  const pool = this.dbManager.getMasterPool();
  
  const result = await pool.query(
    `SELECT 
      c.*,
      CASE 
        WHEN c.plan = 'trial' THEN c.trial_ends_at
        ELSE c.subscription_ends_at
      END as expiry_date
     FROM companies c
     WHERE c.id = $1`,
    [companyId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundException('Company not found');
  }

  const company = result.rows[0];
  const frontendUrl = this.configService.get('frontend.url');

return {
  admin_name: company.admin_name,
  name: company.admin_name,
  admin_email: company.admin_email,
  admin_phone: company.phone || '',
  company_name: company.name,
  plan_label: company.subscription_plan || company.plan || '',
  plan: company.plan || '',
  amount: company.subscription_amount ? String(company.subscription_amount) : '0',
  trial_ends_at: company.trial_ends_at
    ? new Date(company.trial_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '',
  subscription_ends_at: company.subscription_ends_at
    ? new Date(company.subscription_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '',
  payment_date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
  login_url: `${frontendUrl}/login`,
  payment_url: `${frontendUrl}/billing`,
  days: (() => {
    const expiry = company.trial_ends_at || company.subscription_ends_at;
    if (!expiry) return '7';
    const diff = Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return String(Math.max(0, diff));
  })(),
  temp_password: '',
  invoice_number: '',
  total_amount: '',
  subscription_from: '',
  subscription_to: '',
};
}

// Template mein variables replace karo
fillTemplate(template: string, data: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(data)) {
    filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return filled;
}

// Email directly bhejo -- template se
async sendTemplateEmail(companyId: string, templateKey: string, extraData?: Record<string, string>) {
  const pool = this.dbManager.getMasterPool();
  
  const templateResult = await pool.query(
    `SELECT * FROM email_templates WHERE key = $1`,
    [templateKey],
  );
  
  if (templateResult.rows.length === 0) {
    throw new NotFoundException('Template not found');
  }
  
  const template = templateResult.rows[0];
  const companyData = await this.getCompanyTemplateData(companyId);
  const data = { ...companyData, ...(extraData || {}) };
  
  const subject = this.fillTemplate(template.subject, data);
  const body = this.fillTemplate(template.body || '', data);
  
  await this.mailService.sendCustomEmail(
    companyData.admin_email,
    companyData.admin_name,
    subject,
    body,
  );
  
  return { 
    message: 'Email sent successfully',
    sentTo: companyData.admin_email,
  };
}
// Email template create karo
async createEmailTemplate(data: {
  key: string;
  name: string;
  subject: string;
  body?: string;
  description?: string;
  variables?: string[];
}) {
  const pool = this.dbManager.getMasterPool();
  const result = await pool.query(
    `INSERT INTO email_templates (key, name, subject, body, description, variables, type)
     VALUES ($1, $2, $3, $4, $5, $6, 'email')
     RETURNING *`,
    [data.key, data.name, data.subject, data.body || null,
     data.description || null, data.variables || []],
  );
  return result.rows[0];
}

// Email template delete karo
async deleteEmailTemplate(key: string) {
  const pool = this.dbManager.getMasterPool();
  await pool.query(`DELETE FROM email_templates WHERE key = $1`, [key]);
  return { deleted: true };
}

// WhatsApp template create karo
async createWhatsappTemplate(data: {
  key: string;
  name: string;
  body: string;
  description?: string;
  variables?: string[];
}) {
  const pool = this.dbManager.getMasterPool();
  const result = await pool.query(
    `INSERT INTO whatsapp_templates (key, name, body, description, variables)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.key, data.name, data.body,
     data.description || null, data.variables || []],
  );
  return result.rows[0];
}

// WhatsApp template delete karo
async deleteWhatsappTemplate(key: string) {
  const pool = this.dbManager.getMasterPool();
  await pool.query(`DELETE FROM whatsapp_templates WHERE key = $1`, [key]);
  return { deleted: true };
}
async resendInvoiceEmail(invoiceId: string) {
  const pool = this.dbManager.getMasterPool();
  const result = await pool.query(
    `SELECT * FROM invoices WHERE id = $1`, [invoiceId]
  );
  if (result.rows.length === 0) throw new NotFoundException('Invoice not found');
  
  const invoice = result.rows[0];
  
  let pdfBuffer: Buffer | null = null;
  if (invoice.pdf_path) {
    const fs = require('fs');
    if (fs.existsSync(invoice.pdf_path)) {
      pdfBuffer = fs.readFileSync(invoice.pdf_path);
    }
  }
  
  await this.mailService.sendInvoiceEmail(
    invoice.admin_email,
    invoice.admin_name,
    invoice.company_name,
    invoice.invoice_number,
    invoice.plan_label,
    Number(invoice.total_amount),
    new Date(invoice.subscription_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    new Date(invoice.subscription_to).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    pdfBuffer,
  );
  
  return { invoiceNumber: invoice.invoice_number, sentTo: invoice.admin_email };
}
// Audit log create karo
async createAuditLog(data: {
  action: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
  performedBy?: string;
  performedByName?: string;
  ipAddress?: string;
}) {
  const pool = this.dbManager.getMasterPool();

  // performedByName auto-fetch karo agar sirf ID diya hai
  let performedByName = data.performedByName || null;
  if (data.performedBy && !performedByName) {
    const adminResult = await pool.query(
      `SELECT name FROM super_admins WHERE id = $1`,
      [data.performedBy],
    );
    performedByName = adminResult.rows[0]?.name || null;
  }

  await pool.query(
    `INSERT INTO audit_logs 
     (action, entity_type, entity_id, entity_name, details, 
      performed_by, performed_by_name, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      data.action,
      data.entityType || null,
      data.entityId || null,
      data.entityName || null,
      data.details ? JSON.stringify(data.details) : null,
      data.performedBy || null,
      performedByName,
      data.ipAddress || null,
    ],
  );
}

// Audit logs fetch karo
async getAuditLogs(
  page: number = 1,
  limit: number = 20,
  action?: string,
  fromDate?: string,
  toDate?: string,
) {
  const pool = this.dbManager.getMasterPool();
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (action) {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }
  if (fromDate) {
    params.push(fromDate);
    conditions.push(`created_at >= $${params.length}::date`);
  }
  if (toDate) {
    params.push(toDate);
    conditions.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM audit_logs ${where}`,
    params,
  );

  const dataParams = [...params, limit, offset];
  const result = await pool.query(
    `SELECT * FROM audit_logs ${where}
     ORDER BY created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );

  const total = parseInt(countResult.rows[0].count, 10);

  return {
    data: result.rows,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Audit logs CSV export
async exportAuditLogs(
  action?: string,
  fromDate?: string,
  toDate?: string,
): Promise<string> {
  const pool = this.dbManager.getMasterPool();

  const conditions: string[] = [];
  const params: any[] = [];

  if (action) {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }
  if (fromDate) {
    params.push(fromDate);
    conditions.push(`created_at >= $${params.length}::date`);
  }
  if (toDate) {
    params.push(toDate);
    conditions.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT action, entity_type, entity_name, details,
            performed_by_name, ip_address, created_at
     FROM audit_logs ${where}
     ORDER BY created_at DESC
     LIMIT 5000`,
    params,
  );

  const actionLabels: Record<string, string> = {
    CREATED_COMPANY:        'Company Created',
    DELETED_COMPANY:        'Company Deleted',
    ACTIVATED_COMPANY:      'Company Activated',
    DEACTIVATED_COMPANY:    'Company Deactivated',
    ACTIVATED_SUBSCRIPTION: 'Subscription Activated',
    REJECTED_PAYMENT:       'Payment Rejected',
  };

  const escape = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const headers = [
    'Sr No',
    'Action',
    'Entity Type',
    'Entity Name',
    'Details',
    'Performed By',
    'IP Address',
    'Date',
    'Time',
  ];

  const rows = result.rows.map((row, idx) => {
    // IP fix
    const ip = row.ip_address
      ? (row.ip_address === '::1' ? '127.0.0.1' : row.ip_address)
      : 'N/A';

    // Details readable format
    const details = row.details
      ? Object.entries(row.details)
          .map(([k, v]) => {
            const key = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
            return `${key}: ${v}`;
          })
          .join(' | ')
      : 'N/A';

    // Date aur Time alag columns
    const date = new Date(row.created_at);
    const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    return [
      String(idx + 1),
      actionLabels[row.action] || row.action,
      row.entity_type ? row.entity_type.charAt(0).toUpperCase() + row.entity_type.slice(1) : 'N/A',
      row.entity_name || 'N/A',
      details,
      row.performed_by_name || 'System',
      ip,
      dateStr,
      timeStr,
    ].map(escape).join(',');
  });

  // BOM add karo — Excel mein proper open hoga
  const BOM = '\uFEFF';
  return BOM + [headers.map(escape).join(','), ...rows].join('\r\n');
}

// Payment history fetch karo
async getPaymentHistory(page: number = 1, limit: number = 20) {
  const pool = this.dbManager.getMasterPool();
  const offset = (page - 1) * limit;

  const countResult = await pool.query(`SELECT COUNT(*) FROM payment_requests`);
  const result = await pool.query(
    `SELECT pr.*, c.name as company_name, c.admin_email
     FROM payment_requests pr
     LEFT JOIN companies c ON c.id = pr.company_id
     ORDER BY pr.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return {
    data: result.rows,
    meta: {
      total: parseInt(countResult.rows[0].count, 10),
      page, limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
    },
  };
}
async getSystemHealth() {
  const pool = this.dbManager.getMasterPool();
  const startTime = Date.now();

  // PostgreSQL check
  let dbStatus = 'operational';
  let dbResponseTime = 0;
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    dbResponseTime = Date.now() - dbStart;
  } catch {
    dbStatus = 'down';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const totalMem = require('os').totalmem();
  const freeMem = require('os').freemem();
  const usedMem = totalMem - freeMem;

  // CPU check
  const cpuUsage = process.cpuUsage();

  // Uptime
  const uptimeSeconds = process.uptime();
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);

  // DB connections check
  let activeConnections = 0;
  try {
    const connResult = await pool.query(
      `SELECT count(*) FROM pg_stat_activity WHERE state = 'active'`
    );
    activeConnections = parseInt(connResult.rows[0].count, 10);
  } catch {}

  // Company stats
  let companyStats = { total: 0, active: 0, trial: 0 };
  try {
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE plan = 'active') as active,
        COUNT(*) FILTER (WHERE plan = 'trial') as trial
       FROM companies`
    );
    companyStats = {
      total: parseInt(statsResult.rows[0].total, 10),
      active: parseInt(statsResult.rows[0].active, 10),
      trial: parseInt(statsResult.rows[0].trial, 10),
    };
  } catch {}

  return {
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: { days, hours, minutes, totalSeconds: Math.floor(uptimeSeconds) },
    services: {
      api: { status: 'operational', responseTime: Date.now() - startTime },
      database: { status: dbStatus, responseTime: dbResponseTime, activeConnections },
      redis: { status: 'operational' },
      email: { status: 'operational' },
      backgroundJobs: { status: 'operational' },
    },
    memory: {
      used: Math.round(usedMem / 1024 / 1024),
      total: Math.round(totalMem / 1024 / 1024),
      percentage: Math.round((usedMem / totalMem) * 100),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    },
    companies: companyStats,
  };
}
// System settings fetch karo
async getSystemSettings() {
  const pool = this.dbManager.getMasterPool();
  const result = await pool.query(
    `SELECT * FROM system_settings ORDER BY key`
  );
  return result.rows;
}

// System setting update karo
async updateSystemSetting(key: string, value: string) {
  const pool = this.dbManager.getMasterPool();
  const result = await pool.query(
    `UPDATE system_settings 
     SET value = $1, updated_at = NOW()
     WHERE key = $2
     RETURNING *`,
    [value, key]
  );
  if (result.rows.length === 0) {
    throw new NotFoundException(`Setting '${key}' not found`);
  }
  return result.rows[0];
}

// System setting create karo
async createSystemSetting(data: {
  key: string;
  value: string;
  label: string;
  description?: string;
  type?: string;
}) {
  const pool = this.dbManager.getMasterPool();
  const result = await pool.query(
    `INSERT INTO system_settings (key, value, label, description, type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.key, data.value, data.label, data.description || null, data.type || 'text']
  );
  return result.rows[0];
}

// System setting delete karo
async deleteSystemSetting(key: string) {
  const pool = this.dbManager.getMasterPool();
  await pool.query(`DELETE FROM system_settings WHERE key = $1`, [key]);
  return { deleted: true };
}
async getRevenueAnalytics() {
  const pool = this.dbManager.getMasterPool();

  // Last 12 months revenue
  const monthlyResult = await pool.query(`
    SELECT 
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
      DATE_TRUNC('month', created_at) as month_date,
      SUM(total_amount) as revenue,
      COUNT(*) as invoices
    FROM invoices
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month_date ASC
  `);

  // This month revenue
  const thisMonthResult = await pool.query(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as this_month,
      COUNT(*) as this_month_invoices
    FROM invoices
    WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
  `);

  // Last month revenue
  const lastMonthResult = await pool.query(`
    SELECT COALESCE(SUM(total_amount), 0) as last_month
    FROM invoices
    WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
  `);

  // Revenue by plan
  const byPlanResult = await pool.query(`
    SELECT 
      COALESCE(plan_label, plan, 'Unknown') as plan,
      SUM(total_amount) as revenue,
      COUNT(*) as count
    FROM invoices
    GROUP BY COALESCE(plan_label, plan, 'Unknown')
    ORDER BY revenue DESC
  `);

  // Total revenue all time
  const totalResult = await pool.query(`
    SELECT COALESCE(SUM(total_amount), 0) as total
    FROM invoices
  `);

  const thisMonth = Number(thisMonthResult.rows[0].this_month);
  const lastMonth = Number(lastMonthResult.rows[0].last_month);
  const growth = lastMonth > 0
    ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
    : thisMonth > 0 ? 100 : 0;

  const totalRevenue = Number(totalResult.rows[0].total);
  const byPlan = byPlanResult.rows.map(r => ({
    plan: r.plan,
    revenue: Number(r.revenue),
    count: Number(r.count),
    percentage: totalRevenue > 0 ? Math.round((Number(r.revenue) / totalRevenue) * 100) : 0,
  }));

  return {
    thisMonth,
    thisMonthInvoices: Number(thisMonthResult.rows[0].this_month_invoices),
    lastMonth,
    growth,
    totalRevenue,
    monthly: monthlyResult.rows.map(r => ({
      month: r.month,
      revenue: Number(r.revenue),
      invoices: Number(r.invoices),
    })),
    byPlan,
  };
}
// Login history record karo
async recordLoginHistory(data: {
  superAdminId: string;
  ipAddress?: string;
  userAgent?: string;
  status?: string;
  failureReason?: string;
}) {
  const pool = this.dbManager.getMasterPool();
  const device = data.userAgent
    ? data.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
    : 'Unknown';
  await pool.query(
    `INSERT INTO login_history 
     (super_admin_id, ip_address, user_agent, device, status, failure_reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      data.superAdminId,
      data.ipAddress || null,
      data.userAgent || null,
      device,
      data.status || 'success',
      data.failureReason || null,
    ],
  );
}

// Failed login attempt record karo
async recordFailedLogin(identifier: string, ipAddress: string, reason: string) {
  const pool = this.dbManager.getMasterPool();
  await pool.query(
    `INSERT INTO failed_login_attempts (identifier, ip_address, reason)
     VALUES ($1, $2, $3)`,
    [identifier, ipAddress, reason],
  );
}

// Security data fetch karo
async getSecurityData() {
  const pool = this.dbManager.getMasterPool();

  // Active sessions
  const sessionsResult = await pool.query(
    `SELECT sat.*, sa.name, sa.email
     FROM super_admin_tokens sat
     JOIN super_admins sa ON sa.id = sat.super_admin_id
     WHERE sat.expires_at > NOW()
     ORDER BY sat.created_at DESC`
  );

  // Login history last 20
  const historyResult = await pool.query(
    `SELECT lh.*, sa.name, sa.email
     FROM login_history lh
     JOIN super_admins sa ON sa.id = lh.super_admin_id
     ORDER BY lh.created_at DESC
     LIMIT 20`
  );

  // Failed attempts last 20
  const failedResult = await pool.query(
    `SELECT * FROM failed_login_attempts
     ORDER BY created_at DESC
     LIMIT 20`
  );

  // Stats
  const statsResult = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM super_admin_tokens WHERE expires_at > NOW()) as active_sessions,
      (SELECT COUNT(*) FROM login_history WHERE created_at > NOW() - INTERVAL '24 hours' AND status = 'success') as logins_today,
      (SELECT COUNT(*) FROM failed_login_attempts WHERE created_at > NOW() - INTERVAL '24 hours') as failed_today`
  );

  return {
    stats: {
      activeSessions: parseInt(statsResult.rows[0].active_sessions, 10),
      loginsToday: parseInt(statsResult.rows[0].logins_today, 10),
      failedToday: parseInt(statsResult.rows[0].failed_today, 10),
    },
    activeSessions: sessionsResult.rows,
    loginHistory: historyResult.rows,
    failedAttempts: failedResult.rows,
  };
}

// Logout all sessions
async logoutAllSessions(superAdminId: string) {
  const pool = this.dbManager.getMasterPool();
  await pool.query(
    `DELETE FROM super_admin_tokens WHERE super_admin_id = $1`,
    [superAdminId]
  );
  return { message: 'All sessions logged out' };
}

// Single session logout
async logoutSession(tokenId: string, superAdminId: string) {
  const pool = this.dbManager.getMasterPool();
  await pool.query(
    `DELETE FROM super_admin_tokens 
     WHERE id = $1 AND super_admin_id = $2`,
    [tokenId, superAdminId]
  );
  return { message: 'Session logged out' };
}

// Background jobs stats fetch karo
async getBackgroundJobsStats() {
  const pool = this.dbManager.getMasterPool();

  const statsResult = await pool.query(`
    SELECT 
      queue,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'processing') as processing,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) as total
    FROM background_jobs
    GROUP BY queue
    ORDER BY queue
  `);

  const overallResult = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
      COUNT(*) FILTER (WHERE status = 'processing') as total_processing,
      COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
      COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
      COUNT(*) as grand_total
    FROM background_jobs
  `);

  const recentResult = await pool.query(`
    SELECT * FROM background_jobs
    ORDER BY created_at DESC
    LIMIT 20
  `);

  const failedResult = await pool.query(`
    SELECT * FROM background_jobs
    WHERE status = 'failed'
    ORDER BY created_at DESC
    LIMIT 10
  `);

  return {
    overall: {
      pending: parseInt(overallResult.rows[0].total_pending, 10),
      processing: parseInt(overallResult.rows[0].total_processing, 10),
      completed: parseInt(overallResult.rows[0].total_completed, 10),
      failed: parseInt(overallResult.rows[0].total_failed, 10),
      total: parseInt(overallResult.rows[0].grand_total, 10),
    },
    byQueue: statsResult.rows.map(r => ({
      queue: r.queue,
      pending: parseInt(r.pending, 10),
      processing: parseInt(r.processing, 10),
      completed: parseInt(r.completed, 10),
      failed: parseInt(r.failed, 10),
      total: parseInt(r.total, 10),
    })),
    recentJobs: recentResult.rows,
    failedJobs: failedResult.rows,
  };
}

// Failed job retry karo
async retryJob(jobId: string) {
  const pool = this.dbManager.getMasterPool();
  const result = await pool.query(
    `UPDATE background_jobs 
     SET status = 'pending', error = null, attempts = 0, scheduled_at = NOW()
     WHERE id = $1 AND status = 'failed'
     RETURNING *`,
    [jobId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundException('Job not found or not failed');
  }
  return result.rows[0];
}

// Job create karo -- cron/email queue ke liye
async createJob(data: {
  queue: string;
  jobName: string;
  payload?: Record<string, any>;
  scheduledAt?: Date;
}) {
  const pool = this.dbManager.getMasterPool();
  const result = await pool.query(
    `INSERT INTO background_jobs (queue, job_name, payload, scheduled_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      data.queue,
      data.jobName,
      data.payload ? JSON.stringify(data.payload) : null,
      data.scheduledAt || new Date(),
    ]
  );
  return result.rows[0];
}
}