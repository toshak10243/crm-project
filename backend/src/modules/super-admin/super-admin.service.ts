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
import { MailService } from '../../common/services/mail.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { SuperAdminLoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Pool } from 'pg';

@Injectable()
export class SuperAdminService {
  constructor(
    private dbManager: DbManagerService,
    private configService: ConfigService,
    private mailService: MailService,
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
  async createCompany(dto: CreateCompanyDto, superAdminId: string) {
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
  async activateCompany(companyId: string) {
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

    return result.rows[0];
  }

  // Company deactivate karo
  async deactivateCompany(companyId: string) {
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

    return result.rows[0];
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
}