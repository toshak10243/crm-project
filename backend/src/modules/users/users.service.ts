    // Admin ki team management -- users create, update, delete, password reset
// Sirf Admin aur Manager access kar sakte hain

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { MailService } from '../../common/services/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

@Injectable()
export class UsersService {
  constructor(private mailService: MailService) {}

  // Temporary pool banao
  private createPool(dbName: string): Pool {
    return new Pool({
      host: process.env.MASTER_DB_HOST || 'localhost',
      port: parseInt(process.env.MASTER_DB_PORT || '5432', 10),
      database: dbName,
      user: process.env.MASTER_DB_USER || 'postgres',
      password: process.env.MASTER_DB_PASSWORD || 'password',
      max: 2,
    });
  }

  // Saare users list karo -- pagination ke saath
  async getAllUsers(
    dbName: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: string,
    isActive?: boolean,
  ) {
    const pool = this.createPool(dbName);

    try {
      const offset = (page - 1) * limit;
      const conditions: string[] = ['1=1'];
      const params: any[] = [];
      let paramCount = 1;

      if (search) {
        conditions.push(
          `(name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`,
        );
        params.push(`%${search}%`);
        paramCount++;
      }

      if (role) {
        conditions.push(`role = $${paramCount}`);
        params.push(role);
        paramCount++;
      }

      if (isActive !== undefined) {
        conditions.push(`is_active = $${paramCount}`);
        params.push(isActive);
        paramCount++;
      }

      const whereClause = conditions.join(' AND ');

      // Total count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM users WHERE ${whereClause}`,
        params,
      );

      // Users list
      const usersResult = await pool.query(
        `SELECT id, name, email, phone, username, role, 
                department_id, is_active, avatar_url,
                last_login_at, created_at
         FROM users 
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...params, limit, offset],
      );

      const total = parseInt(countResult.rows[0].count, 10);

      return {
        data: usersResult.rows,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } finally {
      await pool.end();
    }
  }

  // Single user detail
  async getUserById(dbName: string, userId: string) {
    const pool = this.createPool(dbName);

    try {
      const result = await pool.query(
        `SELECT id, name, email, phone, username, role,
                department_id, is_active, avatar_url,
                must_change_password, last_login_at, created_at
         FROM users WHERE id = $1`,
        [userId],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('User not found');
      }

      return result.rows[0];
    } finally {
      await pool.end();
    }
  }

  // Naya user create karo
  async createUser(
    dbName: string,
    dto: CreateUserDto,
    createdBy: string,
    companySlug: string,
  ) {
    const pool = this.createPool(dbName);

    try {
      // Email already exist karta hai check karo
      const existing = await pool.query(
        `SELECT id FROM users 
         WHERE email = $1 OR phone = $2 OR username = $3`,
        [dto.email, dto.phone || null, dto.username || null],
      );

      if (existing.rows.length > 0) {
        throw new ConflictException(
          'User with this email, phone or username already exists',
        );
      }

      // Temp password generate karo
      const tempPassword = this.generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      // User insert karo
      const result = await pool.query(
        `INSERT INTO users 
         (name, email, phone, username, password_hash, role, department_id, 
          must_change_password, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
         RETURNING id, name, email, phone, username, role, is_active, created_at`,
        [
          dto.name,
          dto.email,
          dto.phone || null,
          dto.username || null,
          passwordHash,
          dto.role,
          dto.departmentId || null,
          createdBy,
        ],
      );

      // Welcome email bhejo
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
      await this.mailService.sendAdminWelcomeEmail(
        dto.email,
        dto.name,
        companySlug,
        tempPassword,
        loginUrl,
      );

      return result.rows[0];
    } finally {
      await pool.end();
    }
  }

  // User update karo
  async updateUser(
    dbName: string,
    userId: string,
    dto: UpdateUserDto,
    currentUserId: string,
    currentUserRole: string,
  ) {
    const pool = this.createPool(dbName);

    try {
      // User exist karta hai check karo
      const existing = await pool.query(
        `SELECT * FROM users WHERE id = $1`,
        [userId],
      );

      if (existing.rows.length === 0) {
        throw new NotFoundException('User not found');
      }

      const targetUser = existing.rows[0];

      // Manager sirf agent ko update kar sakta hai
      if (
        currentUserRole === 'manager' &&
        targetUser.role !== 'agent'
      ) {
        throw new ForbiddenException(
          'Managers can only update agent accounts',
        );
      }

      // Dynamic update query banao
      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      if (dto.name) {
        updates.push(`name = $${paramCount}`);
        params.push(dto.name);
        paramCount++;
      }

      if (dto.email) {
        updates.push(`email = $${paramCount}`);
        params.push(dto.email);
        paramCount++;
      }

      if (dto.phone !== undefined) {
        updates.push(`phone = $${paramCount}`);
        params.push(dto.phone);
        paramCount++;
      }

      if (dto.username !== undefined) {
        updates.push(`username = $${paramCount}`);
        params.push(dto.username);
        paramCount++;
      }

      if (dto.role) {
        updates.push(`role = $${paramCount}`);
        params.push(dto.role);
        paramCount++;
      }

      if (dto.departmentId !== undefined) {
        updates.push(`department_id = $${paramCount}`);
        params.push(dto.departmentId);
        paramCount++;
      }

      if (dto.isActive !== undefined) {
        updates.push(`is_active = $${paramCount}`);
        params.push(dto.isActive);
        paramCount++;
      }

      if (updates.length === 0) {
        return existing.rows[0];
      }

      updates.push(`updated_at = NOW()`);
      params.push(userId);

      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} 
         WHERE id = $${paramCount}
         RETURNING id, name, email, phone, username, role, is_active, updated_at`,
        params,
      );

      return result.rows[0];
    } finally {
      await pool.end();
    }
  }

  // User activate karo
  async activateUser(dbName: string, userId: string) {
    const pool = this.createPool(dbName);

    try {
      const result = await pool.query(
        `UPDATE users SET is_active = true, updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, email, is_active`,
        [userId],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('User not found');
      }

      return result.rows[0];
    } finally {
      await pool.end();
    }
  }

  // User deactivate karo
  async deactivateUser(dbName: string, userId: string) {
    const pool = this.createPool(dbName);

    try {
      const result = await pool.query(
        `UPDATE users SET is_active = false, updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, email, is_active`,
        [userId],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('User not found');
      }

      return result.rows[0];
    } finally {
      await pool.end();
    }
  }

  // Admin user ka password reset kare
  async resetUserPassword(
    dbName: string,
    userId: string,
    currentUserRole: string,
  ) {
    const pool = this.createPool(dbName);

    try {
      const userResult = await pool.query(
        `SELECT * FROM users WHERE id = $1`,
        [userId],
      );

      if (userResult.rows.length === 0) {
        throw new NotFoundException('User not found');
      }

      const user = userResult.rows[0];

      // Manager sirf agent ka password reset kar sakta hai
      if (currentUserRole === 'manager' && user.role !== 'agent') {
        throw new ForbiddenException(
          'Managers can only reset agent passwords',
        );
      }

      // Naya temp password generate karo
      const tempPassword = this.generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      await pool.query(
        `UPDATE users 
         SET password_hash = $1, must_change_password = true, updated_at = NOW()
         WHERE id = $2`,
        [passwordHash, userId],
      );

      // Email bhejo
      await this.mailService.sendPasswordResetEmail(
        user.email,
        user.name,
        tempPassword,
      );

      return { message: `Password reset successfully. Email sent to ${user.email}` };
    } finally {
      await pool.end();
    }
  }

  // Departments list
  async getDepartments(dbName: string) {
    const pool = this.createPool(dbName);

    try {
      const result = await pool.query(
        `SELECT * FROM departments WHERE is_active = true ORDER BY name`,
      );
      return result.rows;
    } finally {
      await pool.end();
    }
  }

  // Department create karo
  async createDepartment(dbName: string, name: string, description?: string) {
    const pool = this.createPool(dbName);

    try {
      const result = await pool.query(
        `INSERT INTO departments (name, description)
         VALUES ($1, $2)
         RETURNING *`,
        [name, description || null],
      );
      return result.rows[0];
    } finally {
      await pool.end();
    }
  }

  // Temp password generate karo
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