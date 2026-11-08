import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentDb } from '../../common/decorators/current-db.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Pool } from 'pg';

@Controller('branches')
@UseGuards(JwtGuard)
export class BranchesController {
  // GET /api/branches - List all branches with search and pagination
  @Get()
  async getBranches(@CurrentDb() dbPool: Pool, @Query() query: any) {
    const limit = Math.min(parseInt(query.limit || '10', 10), 100);
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['is_active = true'];
    const values: any[] = [];
    let paramIndex = 1;

    if (query.search && query.search.trim()) {
      conditions.push(`(name ILIKE $${paramIndex} OR location ILIKE $${paramIndex} OR city ILIKE $${paramIndex})`);
      values.push(`%${query.search.trim()}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await dbPool.query(`SELECT COUNT(*) FROM branches ${whereClause}`, values);
    const totalRecords = parseInt(countRes.rows[0].count, 10);

    const querySql = `
      SELECT 
        id,
        name,
        COALESCE(location, city, address, '-') AS location,
        COALESCE(created_by_name, '-') AS create_by,
        created_at,
        updated_at
      FROM branches
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const recordsRes = await dbPool.query(querySql, [...values, limit, offset]);

    return {
      data: {
        records: recordsRes.rows,
        total: totalRecords,
        page,
        limit,
      },
      message: 'Branches fetched successfully',
    };
  }

  // POST /api/branches - Create new branch
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBranch(
    @CurrentDb() dbPool: Pool,
    @CurrentUser() user: any,
    @Body() body: { name: string; location?: string },
  ) {
    if (!body.name || !body.name.trim()) {
      throw new BadRequestException('Branch name is required');
    }

    const insertSql = `
      INSERT INTO branches (name, location, city, created_by_name, is_active)
      VALUES ($1, $2, $2, $3, true)
      RETURNING id, name, COALESCE(location, city, '-') AS location, COALESCE(created_by_name, '-') AS create_by, created_at
    `;

    const res = await dbPool.query(insertSql, [
      body.name.trim(),
      body.location ? body.location.trim() : null,
      user.name || 'Admin',
    ]);

    return {
      data: res.rows[0],
      message: 'Branch created successfully',
    };
  }

  // PATCH /api/branches/:id - Update branch
  @Patch(':id')
  async updateBranch(
    @CurrentDb() dbPool: Pool,
    @Param('id') id: string,
    @Body() body: { name: string; location?: string },
  ) {
    if (!body.name || !body.name.trim()) {
      throw new BadRequestException('Branch name is required');
    }

    const updateSql = `
      UPDATE branches
      SET name = $1, location = $2, city = $2, updated_at = NOW()
      WHERE id = $3 AND is_active = true
      RETURNING id, name, COALESCE(location, city, '-') AS location, COALESCE(created_by_name, '-') AS create_by, updated_at
    `;

    const res = await dbPool.query(updateSql, [
      body.name.trim(),
      body.location ? body.location.trim() : null,
      id,
    ]);

    if (res.rows.length === 0) {
      throw new NotFoundException('Branch not found');
    }

    return {
      data: res.rows[0],
      message: 'Branch updated successfully',
    };
  }

  // DELETE /api/branches/:id - Soft delete branch
  @Delete(':id')
  async deleteBranch(@CurrentDb() dbPool: Pool, @Param('id') id: string) {
    const res = await dbPool.query(
      `UPDATE branches SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Branch not found');
    }

    return {
      data: { id },
      message: 'Branch deleted successfully',
    };
  }
}

