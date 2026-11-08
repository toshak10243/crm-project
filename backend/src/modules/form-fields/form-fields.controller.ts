import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentDb } from '../../common/decorators/current-db.decorator';
import { Pool } from 'pg';

@Controller('form-fields')
@UseGuards(JwtGuard)
export class FormFieldsController {
  // GET /api/form-fields - List all active custom fields
  @Get()
  async getFormFields(@CurrentDb() dbPool: Pool) {
    const res = await dbPool.query(`
      SELECT 
        id,
        field_name AS name,
        field_label AS label,
        field_type AS input_type,
        is_required AS required,
        options,
        COALESCE(default_value, '-') AS default_value,
        sort_order,
        is_active,
        created_at
      FROM custom_fields
      WHERE is_active = true
      ORDER BY sort_order ASC, created_at ASC
    `);

    return {
      data: res.rows,
      message: 'Form fields fetched successfully',
    };
  }

  // POST /api/form-fields - Add new custom field
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFormField(
    @CurrentDb() dbPool: Pool,
    @Body()
    body: {
      name: string;
      label?: string;
      input_type: string;
      required?: boolean;
      options?: string | string[];
      default_value?: string;
    },
  ) {
    if (!body.name || !body.name.trim()) {
      throw new BadRequestException('Field name is required');
    }

    const fieldName = body.name.trim();
    const fieldLabel = (body.label && body.label.trim()) || fieldName;
    const inputType = (body.input_type && body.input_type.trim().toLowerCase()) || 'text';
    const isRequired = !!body.required;
    const defaultValue = body.default_value && body.default_value.trim() ? body.default_value.trim() : null;

    // Parse options if provided
    let optionsJson: string | null = null;
    if (['select', 'checkbox', 'radio'].includes(inputType)) {
      if (Array.isArray(body.options)) {
        optionsJson = JSON.stringify(body.options.filter(Boolean));
      } else if (typeof body.options === 'string' && body.options.trim()) {
        const parsed = body.options
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        optionsJson = JSON.stringify(parsed);
      }
    }

    // Get next sort order
    const sortRes = await dbPool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort FROM custom_fields');
    const sortOrder = sortRes.rows[0]?.next_sort || 1;

    const insertSql = `
      INSERT INTO custom_fields (
        entity_type, field_name, field_label, field_type,
        is_required, options, default_value, sort_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING 
        id,
        field_name AS name,
        field_label AS label,
        field_type AS input_type,
        is_required AS required,
        options,
        COALESCE(default_value, '-') AS default_value,
        sort_order,
        created_at
    `;

    const res = await dbPool.query(insertSql, [
      'lead',
      fieldName,
      fieldLabel,
      inputType,
      isRequired,
      optionsJson,
      defaultValue,
      sortOrder,
    ]);

    return {
      data: res.rows[0],
      message: 'Form field created successfully',
    };
  }

  // PATCH /api/form-fields/:id - Update existing custom field
  @Patch(':id')
  async updateFormField(
    @CurrentDb() dbPool: Pool,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      label?: string;
      input_type?: string;
      required?: boolean;
      options?: string | string[];
      default_value?: string;
    },
  ) {
    const checkRes = await dbPool.query('SELECT * FROM custom_fields WHERE id = $1 AND is_active = true', [id]);
    if (checkRes.rows.length === 0) {
      throw new NotFoundException('Form field not found');
    }

    const current = checkRes.rows[0];
    const fieldName = body.name !== undefined ? body.name.trim() : current.field_name;
    const fieldLabel = body.label !== undefined ? body.label.trim() : current.field_label;
    const inputType = body.input_type !== undefined ? body.input_type.trim().toLowerCase() : current.field_type;
    const isRequired = body.required !== undefined ? !!body.required : current.is_required;
    const defaultValue =
      body.default_value !== undefined
        ? body.default_value.trim() || null
        : current.default_value;

    let optionsJson = current.options;
    if (body.options !== undefined) {
      if (Array.isArray(body.options)) {
        optionsJson = JSON.stringify(body.options.filter(Boolean));
      } else if (typeof body.options === 'string') {
        const parsed = body.options
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        optionsJson = JSON.stringify(parsed);
      } else if (body.options === null) {
        optionsJson = null;
      }
    }

    const updateSql = `
      UPDATE custom_fields SET
        field_name = $1,
        field_label = $2,
        field_type = $3,
        is_required = $4,
        options = $5,
        default_value = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING 
        id,
        field_name AS name,
        field_label AS label,
        field_type AS input_type,
        is_required AS required,
        options,
        COALESCE(default_value, '-') AS default_value,
        sort_order,
        updated_at
    `;

    const res = await dbPool.query(updateSql, [
      fieldName,
      fieldLabel,
      inputType,
      isRequired,
      optionsJson,
      defaultValue,
      id,
    ]);

    return {
      data: res.rows[0],
      message: 'Form field updated successfully',
    };
  }

  // DELETE /api/form-fields/:id - Soft delete custom field
  @Delete(':id')
  async deleteFormField(@CurrentDb() dbPool: Pool, @Param('id') id: string) {
    const checkRes = await dbPool.query('SELECT id FROM custom_fields WHERE id = $1 AND is_active = true', [id]);
    if (checkRes.rows.length === 0) {
      throw new NotFoundException('Form field not found');
    }

    await dbPool.query('UPDATE custom_fields SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);

    return {
      success: true,
      message: 'Form field deleted successfully',
    };
  }
}

