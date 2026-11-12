import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

@Injectable()
export class DigimailService {
  private readonly logger = new Logger(DigimailService.name);

  // Initialize Nodemailer with credentials from .env
  private getTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER || 'hostingdigiink@gmail.com';
    const pass = process.env.SMTP_PASS || 'vpukndjbzeashdrt';

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  // Ensure tables exist
  async ensureTables(pool: Pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS digimail_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        total_recipients INT DEFAULT 0,
        sent_count INT DEFAULT 0,
        failed_count INT DEFAULT 0,
        opened_count INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'draft',
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS digimail_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES digimail_campaigns(id) ON DELETE SET NULL,
        lead_id UUID,
        recipient_name VARCHAR(255),
        recipient_email VARCHAR(255) NOT NULL,
        recipient_phone VARCHAR(50),
        subject VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        tracking_token VARCHAR(100) UNIQUE,
        is_opened BOOLEAN DEFAULT FALSE,
        opened_at TIMESTAMP WITH TIME ZONE,
        open_count INT DEFAULT 0,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_digimail_logs_tracking ON digimail_logs(tracking_token);
      CREATE INDEX IF NOT EXISTS idx_digimail_logs_campaign ON digimail_logs(campaign_id);
    `);
  }

  // 1. Get Leads for recipient selection (fetch Name, Email, Phone, Company, Status)
  async getRecipients(
    pool: Pool,
    search?: string,
    limit: number = 500,
    offset: number = 0,
  ) {
    await this.ensureTables(pool);
    const params: any[] = [];
    let idx = 1;
    const where: string[] = ["l.is_deleted = false", "l.email IS NOT NULL", "l.email != ''"];

    if (search && search.trim()) {
      where.push(
        `(l.first_name ILIKE $${idx} OR l.last_name ILIKE $${idx} OR l.name ILIKE $${idx} OR l.email ILIKE $${idx} OR l.phone ILIKE $${idx})`
      );
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM leads l ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const dataRes = await pool.query(
      `SELECT 
        l.id,
        COALESCE(NULLIF(TRIM(CONCAT(l.first_name, ' ', COALESCE(l.last_name, ''))), ''), l.name, 'Customer') AS name,
        l.email,
        l.phone,
        l.city,
        l.company,
        ls.name AS status_name,
        ls.color AS status_color
      FROM leads l
      LEFT JOIN lead_statuses ls ON ls.id = l.status_id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, Math.min(limit, 500), offset]
    );

    return {
      recipients: dataRes.rows,
      total,
      limit: Math.min(limit, 500),
      offset,
    };
  }

  // 2. Get Saved Email Templates from settings/templates
  async getEmailTemplates(pool: Pool) {
    await this.ensureTables(pool);
    const res = await pool.query(
      `SELECT id, type, name, subject, body, is_active, created_at 
       FROM templates 
       WHERE type = 'email' 
       ORDER BY created_at DESC`
    );
    return res.rows;
  }

  // 3. Create a new Email Template directly from DigiMail
  async createEmailTemplate(
    pool: Pool,
    data: { name: string; subject: string; body: string }
  ) {
    if (!data.name || !data.subject || !data.body) {
      throw new BadRequestException('Template Name, Subject, and Body are required');
    }
    const res = await pool.query(
      `INSERT INTO templates (type, name, subject, body, is_active)
       VALUES ('email', $1, $2, $3, true)
       RETURNING *`,
      [data.name.trim(), data.subject.trim(), data.body]
    );
    return res.rows[0];
  }

  // 4. Send Email (Supports Single & Bulk up to 500 max)
  async sendBulkEmail(
    pool: Pool,
    userId: string,
    data: {
      campaignName?: string;
      subject: string;
      htmlContent: string;
      recipients: Array<{
        leadId?: string;
        name: string;
        email: string;
        phone?: string;
        city?: string;
        company?: string;
      }>;
    }
  ) {
    await this.ensureTables(pool);
    if (!data.subject || !data.htmlContent) {
      throw new BadRequestException('Subject and HTML message content are required');
    }

    if (!data.recipients || !Array.isArray(data.recipients) || data.recipients.length === 0) {
      throw new BadRequestException('At least 1 recipient is required');
    }

    // GMAIL DAILY LIMIT SAFEGUARD: Strictly max 500 recipients per bulk send
    if (data.recipients.length > 500) {
      throw new BadRequestException('Daily Gmail SMTP quota limit: Maximum 500 recipients allowed per bulk run');
    }

    const campaignName = data.campaignName?.trim() || `Campaign ${new Date().toLocaleDateString('en-GB')}`;

    // 1. Create Campaign
    const campRes = await pool.query(
      `INSERT INTO digimail_campaigns (name, subject, html_content, total_recipients, status, created_by)
       VALUES ($1, $2, $3, $4, 'processing', $5)
       RETURNING *`,
      [campaignName, data.subject, data.htmlContent, data.recipients.length, userId || null]
    );
    const campaign = campRes.rows[0];

    const transporter = this.getTransporter();
    const fromAddress = `"${process.env.CRM_COMPANY_NAME || 'DigiMail Solutions'}" <${process.env.SMTP_USER || 'hostingdigiink@gmail.com'}>`;
    const backendBaseUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    let sentCount = 0;
    let failedCount = 0;

    // Send asynchronously in background batch to prevent blocking
    (async () => {
      for (const r of data.recipients) {
        if (!r.email) continue;
        const trackingToken = crypto.randomBytes(24).toString('hex');

        // Personalize Template Variables Dynamically for this specific client
        const clientName = r.name || 'Valued Client';
        const clientEmail = r.email || '';
        const clientPhone = r.phone || '';
        const clientCity = r.city || '';
        const clientCompany = r.company || '';

        let personalizedHtml = data.htmlContent
          .replace(/\{\{\s*name\s*\}\}/gi, clientName)
          .replace(/\{\{\s*client_name\s*\}\}/gi, clientName)
          .replace(/\{\{\s*full_name\s*\}\}/gi, clientName)
          .replace(/\{\{\s*email\s*\}\}/gi, clientEmail)
          .replace(/\{\{\s*phone\s*\}\}/gi, clientPhone)
          .replace(/\{\{\s*mobile\s*\}\}/gi, clientPhone)
          .replace(/\{\{\s*city\s*\}\}/gi, clientCity)
          .replace(/\{\{\s*company\s*\}\}/gi, clientCompany);

        // Also personalize dynamic subject line if variables used
        const personalizedSubject = data.subject
          .replace(/\{\{\s*name\s*\}\}/gi, clientName)
          .replace(/\{\{\s*client_name\s*\}\}/gi, clientName)
          .replace(/\{\{\s*full_name\s*\}\}/gi, clientName)
          .replace(/\{\{\s*email\s*\}\}/gi, clientEmail)
          .replace(/\{\{\s*phone\s*\}\}/gi, clientPhone)
          .replace(/\{\{\s*city\s*\}\}/gi, clientCity)
          .replace(/\{\{\s*company\s*\}\}/gi, clientCompany);

        // Embed 1x1 Invisible Tracking Pixel for Read/Opened Detection
        const trackingPixel = `<img src="${backendBaseUrl}/api/digimail/track/${trackingToken}" width="1" height="1" style="display:none !important; visibility:hidden; opacity:0; width:0; height:0;" alt="" />`;
        personalizedHtml += `\n${trackingPixel}`;

        try {
          await transporter.sendMail({
            from: fromAddress,
            to: `"${clientName}" <${clientEmail}>`,
            subject: personalizedSubject,
            html: personalizedHtml,
          });

          // Insert Success Log
          await pool.query(
            `INSERT INTO digimail_logs 
              (campaign_id, lead_id, recipient_name, recipient_email, recipient_phone, subject, status, tracking_token, is_opened, sent_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'sent', $7, false, NOW())`,
            [campaign.id, r.leadId || null, clientName, clientEmail, clientPhone || null, personalizedSubject, trackingToken]
          );
          sentCount++;
        } catch (err: any) {
          this.logger.error(`Failed to send email to ${clientEmail}: ${err.message}`);
          await pool.query(
            `INSERT INTO digimail_logs 
              (campaign_id, lead_id, recipient_name, recipient_email, recipient_phone, subject, status, error_message, tracking_token, is_opened, sent_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'failed', $7, $8, false, NOW())`,
            [campaign.id, r.leadId || null, clientName, clientEmail, clientPhone || null, personalizedSubject, err.message, trackingToken]
          );
          failedCount++;
        }
      }

      // Finalize Campaign Status
      await pool.query(
        `UPDATE digimail_campaigns 
         SET sent_count = $1, failed_count = $2, status = 'completed', updated_at = NOW() 
         WHERE id = $3`,
        [sentCount, failedCount, campaign.id]
      );
    })().catch((e) => this.logger.error('Background bulk mail processing error:', e));

    return {
      message: 'DigiMail campaign dispatched successfully',
      campaignId: campaign.id,
      totalRecipients: data.recipients.length,
      status: 'processing',
    };
  }

  // 5. Track Email Open via 1x1 Pixel
  async trackOpen(pool: Pool, trackingToken: string) {
    if (!trackingToken) return;
    try {
      await this.ensureTables(pool);
      const res = await pool.query(
        `UPDATE digimail_logs
         SET is_opened = true,
             opened_at = COALESCE(opened_at, NOW()),
             open_count = open_count + 1
         WHERE tracking_token = $1
         RETURNING campaign_id, is_opened`,
        [trackingToken]
      );

      if (res.rows.length > 0 && res.rows[0].campaign_id) {
        // Increment unique opened count on campaign
        await pool.query(
          `UPDATE digimail_campaigns 
           SET opened_count = (SELECT COUNT(DISTINCT id) FROM digimail_logs WHERE campaign_id = $1 AND is_opened = true)
           WHERE id = $1`,
          [res.rows[0].campaign_id]
        );
      }
    } catch (err) {
      this.logger.error('Tracking pixel error:', err);
    }
  }

  // 6. Get Campaigns List with Real-time Open Rates
  async getCampaigns(pool: Pool, page: number = 1, limit: number = 15) {
    await this.ensureTables(pool);
    const offset = (page - 1) * limit;
    const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM digimail_campaigns`);
    const total = countRes.rows[0]?.total || 0;

    const dataRes = await pool.query(
      `SELECT 
        c.*,
        CASE 
          WHEN c.sent_count > 0 THEN ROUND((c.opened_count::decimal / c.sent_count) * 100, 1)
          ELSE 0
        END AS open_rate_pct
       FROM digimail_campaigns c
       ORDER BY c.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      campaigns: dataRes.rows,
      total,
      page,
      limit,
    };
  }

  // 7. Get Logs & Delivery/Open History
  async getLogs(
    pool: Pool,
    page: number = 1,
    limit: number = 20,
    campaignId?: string,
    status?: string,
    search?: string
  ) {
    await this.ensureTables(pool);
    const params: any[] = [];
    let idx = 1;
    const where: string[] = [];

    if (campaignId) {
      where.push(`l.campaign_id = $${idx++}`);
      params.push(campaignId);
    }

    if (status && status !== 'all') {
      if (status === 'opened') {
        where.push(`l.is_opened = true`);
      } else {
        where.push(`l.status = $${idx++}`);
        params.push(status);
      }
    }

    if (search && search.trim()) {
      where.push(`(l.recipient_name ILIKE $${idx} OR l.recipient_email ILIKE $${idx} OR l.subject ILIKE $${idx})`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM digimail_logs l ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    const dataRes = await pool.query(
      `SELECT 
        l.*,
        c.name AS campaign_name
       FROM digimail_logs l
       LEFT JOIN digimail_campaigns c ON c.id = l.campaign_id
       ${whereClause}
       ORDER BY l.sent_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    return {
      logs: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // 8. Overall DigiMail Statistics for Dashboard Header
  async getStats(pool: Pool) {
    await this.ensureTables(pool);
    const statsRes = await pool.query(`
      SELECT 
        COUNT(id)::int AS total_logs,
        COUNT(id) FILTER (WHERE status = 'sent')::int AS total_sent,
        COUNT(id) FILTER (WHERE status = 'failed')::int AS total_failed,
        COUNT(id) FILTER (WHERE is_opened = true)::int AS total_opened
      FROM digimail_logs
    `);

    const campRes = await pool.query(`SELECT COUNT(id)::int AS total_campaigns FROM digimail_campaigns`);

    const s = statsRes.rows[0] || {};
    const totalSent = s.total_sent || 0;
    const totalOpened = s.total_opened || 0;
    const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

    return {
      totalCampaigns: campRes.rows[0]?.total_campaigns || 0,
      totalSent,
      totalFailed: s.total_failed || 0,
      totalOpened,
      openRate,
    };
  }
}

