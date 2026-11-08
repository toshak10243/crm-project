import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class SettingsService {
  // Get all settings data for Settings Page
  async getAll(pool: Pool) {
    // 1. Lead Statuses
    const statuses = await pool.query(
      `SELECT id, name, color, is_active, sort_order FROM lead_statuses ORDER BY sort_order ASC, name ASC`,
    );

    // 2. WhatsApp Templates
    const waTemplates = await pool.query(
      `SELECT id, type, name, body, is_active, created_at FROM templates WHERE type = 'whatsapp' ORDER BY created_at DESC`,
    );

    // 3. Email Templates
    const emailTemplates = await pool.query(
      `SELECT id, type, name, subject, body, is_active, created_at FROM templates WHERE type = 'email' ORDER BY created_at DESC`,
    );

    // 4. Lead Sources (Lead From) with assigned manager name
    const leadSources = await pool.query(
      `SELECT 
        s.id, 
        s.name, 
        s.assigned_manager_id, 
        u.name AS assigned_manager_name,
        s.is_active, 
        s.sort_order, 
        s.created_at 
       FROM lead_sources s
       LEFT JOIN users u ON u.id = s.assigned_manager_id
       ORDER BY s.sort_order ASC, s.created_at DESC`,
    );

    // 5. System settings (Auto-Assign Leads)
    const autoAssignRes = await pool.query(
      `SELECT value FROM settings WHERE key = 'auto_assign_leads' LIMIT 1`,
    );
    const autoAssign = autoAssignRes.rows[0]?.value === true || autoAssignRes.rows[0]?.value === 'true';

    // 6. Managers / Users list for Lead From dropdown
    const managers = await pool.query(
      `SELECT id, name, email, role FROM users WHERE is_active = true ORDER BY name ASC`,
    );

    return {
      statuses: statuses.rows,
      whatsappTemplates: waTemplates.rows,
      emailTemplates: emailTemplates.rows,
      leadSources: leadSources.rows,
      autoAssignLeads: autoAssign,
      managers: managers.rows,
    };
  }

  // --- LEAD STATUSES ---
  async createStatus(pool: Pool, data: { name: string; color: string }) {
    if (!data.name || !data.color) {
      throw new BadRequestException('Name and color are required');
    }
    const maxOrder = await pool.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM lead_statuses`);
    const res = await pool.query(
      `INSERT INTO lead_statuses (name, color, sort_order, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [data.name.trim().toUpperCase(), data.color.trim(), maxOrder.rows[0].next_order],
    );
    return res.rows[0];
  }

  async updateStatus(pool: Pool, id: string, data: { name?: string; color?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name) {
      fields.push(`name = $${idx++}`);
      values.push(data.name.trim().toUpperCase());
    }
    if (data.color) {
      fields.push(`color = $${idx++}`);
      values.push(data.color.trim());
    }

    if (fields.length === 0) return null;

    values.push(id);
    const res = await pool.query(
      `UPDATE lead_statuses SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    if (res.rows.length === 0) throw new NotFoundException('Status not found');
    return res.rows[0];
  }

  async deleteStatus(pool: Pool, id: string) {
    await pool.query(`DELETE FROM lead_statuses WHERE id = $1`, [id]);
    return true;
  }

  // --- TEMPLATES ---
  async createTemplate(pool: Pool, data: { type: string; name: string; subject?: string; body: string }) {
    if (!data.name || !data.body) {
      throw new BadRequestException('Name and body are required');
    }
    const res = await pool.query(
      `INSERT INTO templates (type, name, subject, body, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       RETURNING *`,
      [data.type || 'whatsapp', data.name.trim(), data.subject?.trim() || null, data.body.trim()],
    );
    return res.rows[0];
  }

  async updateTemplate(pool: Pool, id: string, data: { name?: string; subject?: string; body?: string }) {
    const fields: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name.trim());
    }
    if (data.subject !== undefined) {
      fields.push(`subject = $${idx++}`);
      values.push(data.subject.trim());
    }
    if (data.body !== undefined) {
      fields.push(`body = $${idx++}`);
      values.push(data.body.trim());
    }

    values.push(id);
    const res = await pool.query(
      `UPDATE templates SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    if (res.rows.length === 0) throw new NotFoundException('Template not found');
    return res.rows[0];
  }

  async deleteTemplate(pool: Pool, id: string) {
    await pool.query(`DELETE FROM templates WHERE id = $1`, [id]);
    return true;
  }

  // --- LEAD SOURCES (Lead From) ---
  async createSource(pool: Pool, data: { name: string; assigned_manager_id?: string }) {
    if (!data.name) {
      throw new BadRequestException('Source name is required');
    }
    const maxOrder = await pool.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM lead_sources`);
    const res = await pool.query(
      `INSERT INTO lead_sources (name, assigned_manager_id, sort_order, is_active, created_at)
       VALUES ($1, $2, $3, true, NOW())
       RETURNING *`,
      [data.name.trim(), data.assigned_manager_id || null, maxOrder.rows[0].next_order],
    );
    return res.rows[0];
  }

  async updateSource(pool: Pool, id: string, data: { name?: string; assigned_manager_id?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name.trim());
    }
    if (data.assigned_manager_id !== undefined) {
      fields.push(`assigned_manager_id = $${idx++}`);
      values.push(data.assigned_manager_id || null);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const res = await pool.query(
      `UPDATE lead_sources SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    if (res.rows.length === 0) throw new NotFoundException('Source not found');
    return res.rows[0];
  }

  async deleteSource(pool: Pool, id: string) {
    await pool.query(`DELETE FROM lead_sources WHERE id = $1`, [id]);
    return true;
  }

  // --- AUTO ASSIGN TOGGLE ---
  async setAutoAssign(pool: Pool, enabled: boolean) {
    await pool.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('auto_assign_leads', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(enabled)],
    );
    return enabled;
  }
}

