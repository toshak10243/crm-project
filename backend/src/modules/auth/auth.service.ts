// Admin aur User ki saari auth logic yahan hai
// Login (email/phone/username), OTP, Redis rate limiting, token blacklist

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DbManagerService } from '../../database/db-manager.service';
import { MailService } from '../../common/services/mail.service';
import { RedisService } from '../../common/services/redis.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Pool } from 'pg';

@Injectable()
export class AuthService {
  constructor(
    private dbManager: DbManagerService,
    private configService: ConfigService,
    private mailService: MailService,
    private redisService: RedisService,
  ) {}

  // Temporary client pool banao -- internally use hota hai
  private createClientPool(dbName: string): Pool {
    return new Pool({
      host: process.env.MASTER_DB_HOST || 'localhost',
      port: parseInt(process.env.MASTER_DB_PORT || '5432', 10),
      database: dbName,
      user: process.env.MASTER_DB_USER || 'postgres',
      password: process.env.MASTER_DB_PASSWORD || 'password',
      max: 2,
    });
  }

  // Email, phone, ya username se user dhundo
  private async findUserByIdentifier(pool: Pool, identifier: string) {
    const result = await pool.query(
      `SELECT * FROM users 
       WHERE (email = $1 OR phone = $1 OR username = $1)
       AND is_active = true`,
      [identifier],
    );
    return result.rows[0] || null;
  }

  // Admin/User login -- email, phone, ya username se
  async login(dto: LoginDto, ipAddress: string, userAgent: string) {
    const masterPool = this.dbManager.getMasterPool();

    // IP block check karo -- too many failed attempts
    const isIpBlocked = await this.redisService.isBlocked(`ip:${ipAddress}`);
    if (isIpBlocked) {
      const ttl = await this.redisService.getBlockTtl(`ip:${ipAddress}`);
      throw new HttpException(
        `Too many failed attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Slug se company dhundo
    const companyResult = await masterPool.query(
      `SELECT db_name, is_active, name FROM companies WHERE slug = $1`,
      [dto.slug],
    );

    if (companyResult.rows.length === 0) {
      throw new UnauthorizedException('Invalid company or credentials');
    }

    const company = companyResult.rows[0];

    if (!company.is_active) {
      throw new UnauthorizedException(
        'Company account is inactive. Contact administrator.',
      );
    }

    const clientPool = this.createClientPool(company.db_name);

    try {
      // Email, phone, ya username se user dhundo
      const user = await this.findUserByIdentifier(clientPool, dto.email);

      if (!user) {
        // Failed attempt count karo
        await this.handleFailedLogin(ipAddress, dto.email);
        throw new UnauthorizedException('Invalid credentials');
      }

      // User block check karo
      const isUserBlocked = await this.redisService.isBlocked(
        `user:${user.id}`,
      );
      if (isUserBlocked) {
        const ttl = await this.redisService.getBlockTtl(`user:${user.id}`);
        throw new HttpException(
          `Account temporarily locked. Try again in ${Math.ceil(ttl / 60)} minutes.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Password verify karo
      const isPasswordValid = await bcrypt.compare(
        dto.password,
        user.password_hash,
      );

      if (!isPasswordValid) {
        await this.handleFailedLogin(ipAddress, user.id);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Successful login -- attempts reset karo
      await this.redisService.resetLoginAttempts(`ip:${ipAddress}`);
      await this.redisService.resetLoginAttempts(`user:${user.id}`);

      // Last login update karo
      await clientPool.query(
        `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
        [user.id],
      );

      // Tokens generate karo
      const tokens = await this.generateTokens(
        user.id,
        user.role,
        company.db_name,
        dto.slug,
        clientPool,
      );

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          username: user.username,
          role: user.role,
          mustChangePassword: user.must_change_password,
          companySlug: dto.slug,
        },
        ...tokens,
      };
    } finally {
      await clientPool.end();
    }
  }

  // Failed login handle karo -- rate limiting
  private async handleFailedLogin(ipAddress: string, userId: string) {
    // IP attempts
    const ipAttempts = await this.redisService.incrementLoginAttempts(
      `ip:${ipAddress}`,
    );
    if (ipAttempts >= 10) {
      await this.redisService.blockAccount(`ip:${ipAddress}`, 900); // 15 min
    }

    // User attempts
    const userAttempts = await this.redisService.incrementLoginAttempts(
      `user:${userId}`,
    );
    if (userAttempts >= 5) {
      await this.redisService.blockAccount(`user:${userId}`, 900); // 15 min
    }
  }

  // Token refresh
  async refreshToken(refreshToken: string) {
    // Blacklist check karo
    const isBlacklisted =
      await this.redisService.isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    try {
      const secret = this.configService.get<string>('jwt.refreshSecret');
      const payload = jwt.verify(refreshToken, secret) as any;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const clientPool = this.createClientPool(payload.dbName);

      try {
        const tokenHash = crypto
          .createHash('sha256')
          .update(refreshToken)
          .digest('hex');

        const tokenResult = await clientPool.query(
          `SELECT * FROM user_tokens 
           WHERE user_id = $1 
           AND token_hash = $2 
           AND expires_at > NOW()`,
          [payload.sub, tokenHash],
        );

        if (tokenResult.rows.length === 0) {
          throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // Old token delete karo -- one time use
        await clientPool.query(
          `DELETE FROM user_tokens WHERE token_hash = $1`,
          [tokenHash],
        );

        const userResult = await clientPool.query(
          `SELECT * FROM users WHERE id = $1 AND is_active = true`,
          [payload.sub],
        );

        if (userResult.rows.length === 0) {
          throw new UnauthorizedException('User not found or inactive');
        }

        const user = userResult.rows[0];

        const tokens = await this.generateTokens(
          user.id,
          user.role,
          payload.dbName,
          payload.companySlug,
          clientPool,
        );

        return tokens;
      } finally {
        await clientPool.end();
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // Logout -- token blacklist karo
  async logout(userId: string, refreshToken: string, dbName: string) {
    const clientPool = this.createClientPool(dbName);

    try {
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      // DB se delete karo
      await clientPool.query(
        `DELETE FROM user_tokens WHERE user_id = $1 AND token_hash = $2`,
        [userId, tokenHash],
      );

      // Redis blacklist mein add karo -- 30 days
      await this.redisService.blacklistToken(refreshToken, 30 * 24 * 60 * 60);
    } finally {
      await clientPool.end();
    }
  }

  // Password change -- logged in user ke liye
  async changePassword(
    userId: string,
    dbName: string,
    dto: ChangePasswordDto,
  ) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException(
        'New password and confirm password do not match',
      );
    }

    const clientPool = this.createClientPool(dbName);

    try {
      const userResult = await clientPool.query(
        `SELECT * FROM users WHERE id = $1`,
        [userId],
      );

      if (userResult.rows.length === 0) {
        throw new NotFoundException('User not found');
      }

      const user = userResult.rows[0];

      // Current password verify karo
      const isCurrentValid = await bcrypt.compare(
        dto.currentPassword,
        user.password_hash,
      );

      if (!isCurrentValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      // Naya password same to nahi -- security check
      const isSamePassword = await bcrypt.compare(
        dto.newPassword,
        user.password_hash,
      );
      if (isSamePassword) {
        throw new BadRequestException(
          'New password cannot be same as current password',
        );
      }

      const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

      await clientPool.query(
        `UPDATE users 
         SET password_hash = $1, must_change_password = false, updated_at = NOW()
         WHERE id = $2`,
        [newPasswordHash, userId],
      );

      // Saare refresh tokens delete karo -- security
      await clientPool.query(
        `DELETE FROM user_tokens WHERE user_id = $1`,
        [userId],
      );
    } finally {
      await clientPool.end();
    }
  }

  // Forgot password -- OTP bhejo
  // Email, phone, ya username se user dhundta hai
  async forgotPassword(identifier: string, slug: string) {
    const masterPool = this.dbManager.getMasterPool();

    const companyResult = await masterPool.query(
      `SELECT db_name FROM companies WHERE slug = $1 AND is_active = true`,
      [slug],
    );

    if (companyResult.rows.length === 0) {
      throw new NotFoundException(
        'No account found with this email, phone or username',
      );
    }

    const clientPool = this.createClientPool(companyResult.rows[0].db_name);

    try {
      // Email, phone, ya username se dhundo
      const user = await this.findUserByIdentifier(clientPool, identifier);

      if (!user) {
        throw new NotFoundException(
          'No account found with this email, phone or username',
        );
      }

      // Resend cooldown check karo -- 60 seconds
      const cooldown = await this.redisService.canResendOtp(
        `forgot:${user.id}`,
      );
      if (!cooldown.allowed) {
        throw new HttpException(
          `Please wait ${cooldown.remainingSeconds} seconds before requesting another OTP`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // 6 digit OTP generate karo
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Redis mein save karo -- 10 min TTL
      await this.redisService.setOtp(`forgot:${user.id}`, otp, 600);

      // Cooldown set karo -- 60 seconds
      await this.redisService.setOtpCooldown(`forgot:${user.id}`);

      // Email bhejo
      if (user.email) {
        await this.mailService.sendOtpEmail(user.email, user.name, otp);
      }

      return {
        message: 'OTP sent successfully',
        userId: user.id,
        email: user.email
          ? user.email.replace(/(.{2}).*(@.*)/, '$1***$2')
          : null,
      };
    } finally {
      await clientPool.end();
    }
  }

  // OTP resend karo
  async resendOtp(userId: string, dbName: string) {
    // Cooldown check karo
    const cooldown = await this.redisService.canResendOtp(`forgot:${userId}`);
    if (!cooldown.allowed) {
      throw new HttpException(
        `Please wait ${cooldown.remainingSeconds} seconds before requesting another OTP`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const clientPool = this.createClientPool(dbName);

    try {
      const userResult = await clientPool.query(
        `SELECT * FROM users WHERE id = $1 AND is_active = true`,
        [userId],
      );

      if (userResult.rows.length === 0) {
        throw new NotFoundException('User not found');
      }

      const user = userResult.rows[0];

      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Redis mein save karo -- 10 min
      await this.redisService.setOtp(`forgot:${user.id}`, otp, 600);

      // Cooldown reset karo -- 60 seconds
      await this.redisService.setOtpCooldown(`forgot:${user.id}`);

      if (user.email) {
        await this.mailService.sendOtpEmail(user.email, user.name, otp);
      }

      return { message: 'OTP resent successfully' };
    } finally {
      await clientPool.end();
    }
  }

  // OTP verify karke password reset karo
  async resetPasswordWithOtp(
    userId: string,
    slug: string,
    otp: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Redis se OTP check karo
    const savedOtp = await this.redisService.getOtp(`forgot:${userId}`);

    if (!savedOtp) {
      throw new BadRequestException('OTP expired. Please request a new one');
    }

    if (savedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    const masterPool = this.dbManager.getMasterPool();

    const companyResult = await masterPool.query(
      `SELECT db_name FROM companies WHERE slug = $1 AND is_active = true`,
      [slug],
    );

    if (companyResult.rows.length === 0) {
      throw new BadRequestException('Invalid request');
    }

    const clientPool = this.createClientPool(companyResult.rows[0].db_name);

    try {
      const passwordHash = await bcrypt.hash(newPassword, 12);

      await clientPool.query(
        `UPDATE users 
         SET password_hash = $1, must_change_password = false, updated_at = NOW()
         WHERE id = $2`,
        [passwordHash, userId],
      );

      // Saare tokens delete karo
      await clientPool.query(
        `DELETE FROM user_tokens WHERE user_id = $1`,
        [userId],
      );

      // OTP delete karo Redis se
      await this.redisService.deleteOtp(`forgot:${userId}`);

      return { message: 'Password reset successfully' };
    } finally {
      await clientPool.end();
    }
  }

  // Super Admin forgot password
  async superAdminForgotPassword(identifier: string) {
    const masterPool = this.dbManager.getMasterPool();

    // Email, phone, ya username se dhundo
    const result = await masterPool.query(
      `SELECT * FROM super_admins 
       WHERE (email = $1 OR phone = $1 OR username = $1) 
       AND is_active = true`,
      [identifier],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        'No account found with this email, phone or username',
      );
    }

    const superAdmin = result.rows[0];

    // Cooldown check karo
    const cooldown = await this.redisService.canResendOtp(
      `sa_forgot:${superAdmin.id}`,
    );
    if (!cooldown.allowed) {
      throw new HttpException(
        `Please wait ${cooldown.remainingSeconds} seconds before requesting another OTP`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Redis mein save karo -- 10 min
    await this.redisService.setOtp(`sa_forgot:${superAdmin.id}`, otp, 600);

    // Cooldown set karo
    await this.redisService.setOtpCooldown(`sa_forgot:${superAdmin.id}`);

    if (superAdmin.email) {
      await this.mailService.sendOtpEmail(
        superAdmin.email,
        superAdmin.name,
        otp,
      );
    }

    return {
      message: 'OTP sent successfully',
      userId: superAdmin.id,
      email: superAdmin.email
        ? superAdmin.email.replace(/(.{2}).*(@.*)/, '$1***$2')
        : null,
    };
  }

  // Super Admin OTP resend
  async superAdminResendOtp(userId: string) {
    const cooldown = await this.redisService.canResendOtp(
      `sa_forgot:${userId}`,
    );
    if (!cooldown.allowed) {
      throw new HttpException(
        `Please wait ${cooldown.remainingSeconds} seconds before requesting another OTP`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const masterPool = this.dbManager.getMasterPool();
    const result = await masterPool.query(
      `SELECT * FROM super_admins WHERE id = $1 AND is_active = true`,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Super Admin not found');
    }

    const superAdmin = result.rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await this.redisService.setOtp(`sa_forgot:${superAdmin.id}`, otp, 600);
    await this.redisService.setOtpCooldown(`sa_forgot:${superAdmin.id}`);

    if (superAdmin.email) {
      await this.mailService.sendOtpEmail(
        superAdmin.email,
        superAdmin.name,
        otp,
      );
    }

    return { message: 'OTP resent successfully' };
  }

  // Super Admin OTP verify aur password reset
  async superAdminResetPassword(
    userId: string,
    otp: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Redis se OTP check karo
    const savedOtp = await this.redisService.getOtp(`sa_forgot:${userId}`);

    if (!savedOtp) {
      throw new BadRequestException('OTP expired. Please request a new one');
    }

    if (savedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    const masterPool = this.dbManager.getMasterPool();
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await masterPool.query(
      `UPDATE super_admins 
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, userId],
    );

    // Saare tokens delete karo
    await masterPool.query(
      `DELETE FROM super_admin_tokens WHERE super_admin_id = $1`,
      [userId],
    );

    // OTP delete karo Redis se
    await this.redisService.deleteOtp(`sa_forgot:${userId}`);

    return { message: 'Password reset successfully' };
  }

  // Profile dekho
  async getProfile(userId: string, dbName: string) {
    const clientPool = this.createClientPool(dbName);

    try {
      const result = await clientPool.query(
        `SELECT id, name, email, phone, username, role, avatar_url, 
                must_change_password, last_login_at, created_at
         FROM users WHERE id = $1`,
        [userId],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('User not found');
      }

      return result.rows[0];
    } finally {
      await clientPool.end();
    }
  }

  // JWT tokens generate karo
  private async generateTokens(
    userId: string,
    role: string,
    dbName: string,
    companySlug: string,
    pool: Pool,
  ) {
    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');

    const accessToken = jwt.sign(
      { sub: userId, role, dbName, companySlug, type: 'access' },
      accessSecret,
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign(
      { sub: userId, role, dbName, companySlug, type: 'refresh' },
      refreshSecret,
      { expiresIn: '30d' },
    );

    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await pool.query(
      `INSERT INTO user_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [userId, tokenHash],
    );

    return { accessToken, refreshToken };
  }
}