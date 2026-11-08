import { Injectable, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class WaDaddyService {
  // 1. CONTACTS
  async getContacts(
    pool: Pool,
    page: number = 1,
    limit: number = 10,
    search?: string,
    group?: string,
  ) {
    const params: any[] = [];
    let idx = 1;
    const where: string[] = [];

    if (search && search.trim()) {
      where.push(`(full_name ILIKE $${idx} OR phone ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    if (group && group.trim() && group !== 'All') {
      where.push(`group_name = $${idx++}`);
      params.push(group.trim());
    }

    const whereStr = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(id)::int AS total FROM wa_contacts ${whereStr}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    const dataRes = await pool.query(
      `SELECT * FROM wa_contacts ${whereStr} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    return {
      contacts: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async createContact(
    pool: Pool,
    data: { full_name: string; phone: string; email?: string; group_name?: string },
  ) {
    if (!data.full_name || !data.phone) {
      throw new BadRequestException('Full name and phone number are required');
    }
    const res = await pool.query(
      `INSERT INTO wa_contacts (full_name, phone, email, group_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email
       RETURNING *`,
      [data.full_name.trim(), data.phone.trim(), data.email?.trim() || null, data.group_name || 'General'],
    );
    return res.rows[0];
  }

  async deleteContact(pool: Pool, id: string) {
    await pool.query(`DELETE FROM wa_contacts WHERE id = $1`, [id]);
    return true;
  }

  // 2. CAMPAIGNS
  async getCampaigns(
    pool: Pool,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    const params: any[] = [];
    let idx = 1;
    const where: string[] = [];

    if (search && search.trim()) {
      where.push(`campaign_name ILIKE $${idx++}`);
      params.push(`%${search.trim()}%`);
    }

    const whereStr = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const countRes = await pool.query(
      `SELECT COUNT(id)::int AS total FROM wa_campaigns ${whereStr}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    const dataRes = await pool.query(
      `SELECT * FROM wa_campaigns ${whereStr} ORDER BY created_date DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    return {
      campaigns: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async createCampaign(
    pool: Pool,
    data: { campaign_name: string; contacts_count?: number },
  ) {
    if (!data.campaign_name) {
      throw new BadRequestException('Campaign name is required');
    }
    const res = await pool.query(
      `INSERT INTO wa_campaigns (campaign_name, created_date, status, contacts_count, created_by_name)
       VALUES ($1, NOW(), 'IN_PROGRESS', $2, 'CRM System')
       RETURNING *`,
      [data.campaign_name.trim(), data.contacts_count || 1],
    );
    return res.rows[0];
  }

  // 3. TEMPLATES
  async getTemplates(pool: Pool, status?: string) {
    const params: any[] = [];
    let whereStr = '';
    if (status && status.trim() && status !== 'All') {
      whereStr = 'WHERE status = $1';
      params.push(status.trim());
    }

    const res = await pool.query(
      `SELECT * FROM wa_templates ${whereStr} ORDER BY created_at ASC`,
      params,
    );
    return res.rows;
  }

  // 4. CHAT THREADS & MESSAGES
  async getChatThreads(pool: Pool) {
    const res = await pool.query(`
      SELECT 
        c.id AS contact_id,
        c.full_name,
        c.phone,
        c.email,
        (
          SELECT text FROM wa_messages m 
          WHERE m.contact_id = c.id 
          ORDER BY m.created_at DESC LIMIT 1
        ) AS last_message,
        (
          SELECT created_at FROM wa_messages m 
          WHERE m.contact_id = c.id 
          ORDER BY m.created_at DESC LIMIT 1
        ) AS last_message_time,
        (
          SELECT COUNT(id)::int FROM wa_messages m 
          WHERE m.contact_id = c.id
        ) AS total_messages
      FROM wa_contacts c
      ORDER BY last_message_time DESC NULLS LAST, c.created_at DESC
    `);
    return res.rows;
  }

  async getMessages(pool: Pool, contactId: string) {
    const res = await pool.query(
      `SELECT * FROM wa_messages WHERE contact_id = $1 ORDER BY created_at ASC`,
      [contactId],
    );
    return res.rows;
  }

  async sendMessage(
    pool: Pool,
    contactId: string,
    text: string,
    sender: string = 'agent',
  ) {
    if (!text || !text.trim()) {
      throw new BadRequestException('Message text cannot be empty');
    }
    const res = await pool.query(
      `INSERT INTO wa_messages (contact_id, sender, text, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [contactId, sender, text.trim()],
    );
    return res.rows[0];
  }
}

