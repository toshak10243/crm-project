import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import { DbManagerService } from '../../database/db-manager.service';
import { TenantPoolService } from '../../database/tenant-pool.service';

export interface LineItem {
  name: string;
  description?: string;
  hsn?: string;
  qty: number;
  rate: number;
  tax_pct: number;
  amount: number;
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private readonly dbManagerService: DbManagerService,
    private readonly tenantPoolService: TenantPoolService,
  ) {}

  // Ensure tables and columns exist in tenant DB
  async ensureTables(pool: Pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_number VARCHAR(50),
        lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        title VARCHAR(500),
        status VARCHAR(50) DEFAULT 'draft',
        items JSONB NOT NULL DEFAULT '[]',
        subtotal DECIMAL(15,2) DEFAULT 0,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        discount_type VARCHAR(20) DEFAULT 'fixed',
        discount_value DECIMAL(15,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'INR',
        valid_until DATE,
        terms TEXT,
        notes TEXT,
        pdf_url VARCHAR(500),
        sent_at TIMESTAMPTZ,
        accepted_at TIMESTAMPTZ,
        rejected_at TIMESTAMPTZ,
        is_deleted BOOLEAN DEFAULT false,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS public_token VARCHAR(100) UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex')`);
    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_email VARCHAR(255)`);
    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50)`);
    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_address TEXT`);
    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS accepted_by_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS accepted_notes TEXT`);
    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);
    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50),
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
        quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
        items JSONB NOT NULL DEFAULT '[]',
        subtotal DECIMAL(15,2) DEFAULT 0,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        paid_amount DECIMAL(15,2) DEFAULT 0,
        due_amount DECIMAL(15,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'unpaid',
        due_date DATE,
        paid_at TIMESTAMPTZ,
        notes TEXT,
        is_deleted BOOLEAN DEFAULT false,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS public_token VARCHAR(100) UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex')`);
    await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS title VARCHAR(500)`);
    await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_email VARCHAR(255)`);
    await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50)`);
    await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_address TEXT`);
    await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50)`);
    await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100)`);
  }

  // Generate Quotation Number: QT-YYYY-XXXX
  private async generateQuoteNumber(pool: Pool): Promise<string> {
    const year = new Date().getFullYear();
    const res = await pool.query(
      `SELECT COUNT(*)::int AS count FROM quotations WHERE EXTRACT(YEAR FROM created_at) = $1`,
      [year]
    );
    const num = (res.rows[0]?.count || 0) + 1;
    return `QT-${year}-${String(num).padStart(4, '0')}`;
  }

  // Generate Invoice Number: INV-YYYY-XXXX
  private async generateInvoiceNumber(pool: Pool): Promise<string> {
    const year = new Date().getFullYear();
    const res = await pool.query(
      `SELECT COUNT(*)::int AS count FROM invoices WHERE EXTRACT(YEAR FROM created_at) = $1`,
      [year]
    );
    const num = (res.rows[0]?.count || 0) + 1;
    return `INV-${year}-${String(num).padStart(4, '0')}`;
  }

  // ==========================================
  // QUOTATIONS API
  // ==========================================

  // 1. List Quotations with Search, Filter & Pagination
  async getQuotations(
    pool: Pool,
    query: {
      search?: string;
      status?: string;
      leadId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    await this.ensureTables(pool);
    const { search, status, leadId, page = 1, limit = 20 } = query;
    const params: any[] = [];
    let idx = 1;
    const where: string[] = ['q.is_deleted = false'];

    if (status && status !== 'all') {
      where.push(`q.status = $${idx++}`);
      params.push(status);
    }

    if (leadId) {
      where.push(`q.lead_id = $${idx++}`);
      params.push(leadId);
    }

    if (search && search.trim()) {
      where.push(
        `(q.quote_number ILIKE $${idx} OR q.title ILIKE $${idx} OR q.client_name ILIKE $${idx} OR q.client_email ILIKE $${idx} OR l.name ILIKE $${idx})`
      );
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM quotations q LEFT JOIN leads l ON l.id = q.lead_id ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    const dataRes = await pool.query(
      `SELECT 
        q.*,
        l.name AS lead_name,
        l.phone AS lead_phone,
        l.email AS lead_email,
        l.city AS lead_city,
        inv.id AS converted_invoice_id,
        inv.invoice_number AS converted_invoice_number
       FROM quotations q
       LEFT JOIN leads l ON l.id = q.lead_id
       LEFT JOIN invoices inv ON inv.quotation_id = q.id AND inv.is_deleted = false
       ${whereClause}
       ORDER BY q.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    // Calculate Summary Metrics
    const metricsRes = await pool.query(`
      SELECT 
        COUNT(*)::int AS total_quotes,
        COALESCE(SUM(total_amount), 0)::numeric AS total_value,
        COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted_count,
        COUNT(*) FILTER (WHERE status = 'sent' OR status = 'draft')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'converted')::int AS converted_count
      FROM quotations
      WHERE is_deleted = false
    `);

    return {
      quotations: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      metrics: metricsRes.rows[0],
    };
  }

  // 2. Get Single Quotation by ID
  async getQuotationById(pool: Pool, id: string) {
    await this.ensureTables(pool);
    const res = await pool.query(
      `SELECT 
        q.*,
        l.name AS lead_name,
        l.phone AS lead_phone,
        l.email AS lead_email,
        l.city AS lead_city,
        u.name AS creator_name
       FROM quotations q
       LEFT JOIN leads l ON l.id = q.lead_id
       LEFT JOIN users u ON u.id = q.created_by
       WHERE q.id = $1 AND q.is_deleted = false`,
      [id]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException('Quotation not found');
    }
    return res.rows[0];
  }

  // 3. Create Quotation
  async createQuotation(
    pool: Pool,
    userId: string,
    data: {
      lead_id?: string;
      title: string;
      client_name: string;
      client_email?: string;
      client_phone?: string;
      client_address?: string;
      valid_until?: string;
      items: LineItem[];
      discount_type?: 'fixed' | 'percentage';
      discount_value?: number;
      terms?: string;
      notes?: string;
      status?: string;
    }
  ) {
    await this.ensureTables(pool);
    if (!data.title || !data.client_name) {
      throw new BadRequestException('Title and Client Name are required');
    }

    const items = data.items || [];
    let subtotal = 0;
    let taxAmount = 0;

    for (const item of items) {
      const lineSub = (Number(item.qty) || 1) * (Number(item.rate) || 0);
      const lineTax = (lineSub * (Number(item.tax_pct) || 0)) / 100;
      subtotal += lineSub;
      taxAmount += lineTax;
      item.amount = Math.round((lineSub + lineTax) * 100) / 100;
    }

    const discountVal = Number(data.discount_value) || 0;
    let discountAmount = 0;
    if (data.discount_type === 'percentage') {
      discountAmount = (subtotal * discountVal) / 100;
    } else {
      discountAmount = discountVal;
    }

    const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);
    const quoteNumber = await this.generateQuoteNumber(pool);
    const publicToken = `qt_${crypto.randomBytes(18).toString('hex')}`;

    const res = await pool.query(
      `INSERT INTO quotations 
        (quote_number, public_token, lead_id, title, client_name, client_email, client_phone, client_address,
         status, items, subtotal, tax_amount, discount_type, discount_value, discount_amount, total_amount,
         valid_until, terms, notes, created_by, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
       RETURNING *`,
      [
        quoteNumber,
        publicToken,
        data.lead_id || null,
        data.title.trim(),
        data.client_name.trim(),
        data.client_email || null,
        data.client_phone || null,
        data.client_address || null,
        data.status || 'sent',
        JSON.stringify(items),
        subtotal,
        taxAmount,
        data.discount_type || 'fixed',
        discountVal,
        discountAmount,
        totalAmount,
        data.valid_until || null,
        data.terms || null,
        data.notes || null,
        userId || null,
      ]
    );

    return res.rows[0];
  }

  // 4. Update Quotation
  async updateQuotation(pool: Pool, id: string, data: Partial<any>) {
    await this.ensureTables(pool);
    const existing = await this.getQuotationById(pool, id);

    let items = data.items !== undefined ? data.items : existing.items;
    let subtotal = Number(existing.subtotal);
    let taxAmount = Number(existing.tax_amount);

    if (data.items) {
      subtotal = 0;
      taxAmount = 0;
      for (const item of items) {
        const lineSub = (Number(item.qty) || 1) * (Number(item.rate) || 0);
        const lineTax = (lineSub * (Number(item.tax_pct) || 0)) / 100;
        subtotal += lineSub;
        taxAmount += lineTax;
        item.amount = Math.round((lineSub + lineTax) * 100) / 100;
      }
    }

    const discType = data.discount_type || existing.discount_type || 'fixed';
    const discVal = data.discount_value !== undefined ? Number(data.discount_value) : Number(existing.discount_value);
    let discountAmount = 0;
    if (discType === 'percentage') {
      discountAmount = (subtotal * discVal) / 100;
    } else {
      discountAmount = discVal;
    }

    const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);

    const res = await pool.query(
      `UPDATE quotations SET
        title = COALESCE($1, title),
        client_name = COALESCE($2, client_name),
        client_email = COALESCE($3, client_email),
        client_phone = COALESCE($4, client_phone),
        client_address = COALESCE($5, client_address),
        status = COALESCE($6, status),
        items = $7,
        subtotal = $8,
        tax_amount = $9,
        discount_type = $10,
        discount_value = $11,
        discount_amount = $12,
        total_amount = $13,
        valid_until = COALESCE($14, valid_until),
        terms = COALESCE($15, terms),
        notes = COALESCE($16, notes),
        updated_at = NOW()
       WHERE id = $17 AND is_deleted = false
       RETURNING *`,
      [
        data.title,
        data.client_name,
        data.client_email,
        data.client_phone,
        data.client_address,
        data.status,
        JSON.stringify(items),
        subtotal,
        taxAmount,
        discType,
        discVal,
        discountAmount,
        totalAmount,
        data.valid_until,
        data.terms,
        data.notes,
        id,
      ]
    );

    return res.rows[0];
  }

  // 5. Delete Quotation
  async deleteQuotation(pool: Pool, id: string) {
    await this.ensureTables(pool);
    await pool.query(`UPDATE quotations SET is_deleted = true, updated_at = NOW() WHERE id = $1`, [id]);
    return { success: true, message: 'Quotation deleted successfully' };
  }

  // 6. Public Get Quotation via Shared Web Link (No auth required)
  async getPublicQuotation(token: string) {
    if (!token) throw new BadRequestException('Token required');

    const masterPool = this.dbManagerService.getMasterPool();
    const compRes = await masterPool.query(`SELECT db_name FROM companies WHERE is_active = true`);

    for (const comp of compRes.rows) {
      try {
        const pool = this.tenantPoolService.getPool(comp.db_name);
        await this.ensureTables(pool);

        const res = await pool.query(
          `SELECT 
            q.*,
            l.name AS lead_name,
            l.phone AS lead_phone,
            l.email AS lead_email,
            l.city AS lead_city
           FROM quotations q
           LEFT JOIN leads l ON l.id = q.lead_id
           WHERE q.public_token = $1 AND q.is_deleted = false`,
          [token]
        );

        if (res.rows.length > 0) {
          // Record viewed_at if not set
          await pool.query(
            `UPDATE quotations SET viewed_at = COALESCE(viewed_at, NOW()) WHERE public_token = $1`,
            [token]
          );

          // Get company about info for letterhead
          const settingsRes = await pool.query(
            `SELECT value FROM settings WHERE key = 'about_company' LIMIT 1`
          );
          const company = settingsRes.rows[0]?.value || {
            companyName: 'DigiInk Solutions',
            brandName: 'DigiInk CRM',
            email: 'support@digiinksolutions.com',
            phone: '+91 9024154995',
            website: 'https://www.digiinksolutions.com',
            gstin: '08AGHPP4568R1ZD',
            addressLine1: '318 3rd and 4th, Metro Station New Aatish Market',
            addressLine2: 'Devi Nagar, Mansarovar, Jaipur, Rajasthan 302020',
          };

          return {
            quotation: res.rows[0],
            company,
            dbName: comp.db_name,
          };
        }
      } catch {
        continue;
      }
    }

    throw new NotFoundException('Quotation not found or link has expired');
  }

  // 7. Public Accept Quotation (Client signs & accepts online)
  async publicAcceptQuotation(token: string, body: { client_name: string; remarks?: string }) {
    if (!token) throw new BadRequestException('Token required');
    if (!body.client_name || !body.client_name.trim()) {
      throw new BadRequestException('Please enter your name to confirm acceptance');
    }

    const masterPool = this.dbManagerService.getMasterPool();
    const compRes = await masterPool.query(`SELECT db_name FROM companies WHERE is_active = true`);

    for (const comp of compRes.rows) {
      try {
        const pool = this.tenantPoolService.getPool(comp.db_name);
        await this.ensureTables(pool);

        const res = await pool.query(
          `UPDATE quotations 
           SET status = 'accepted',
               accepted_at = NOW(),
               accepted_by_name = $1,
               accepted_notes = $2,
               updated_at = NOW()
           WHERE public_token = $3 AND is_deleted = false
           RETURNING *`,
          [body.client_name.trim(), body.remarks || null, token]
        );

        if (res.rows.length > 0) {
          this.logger.log(`Quotation ${res.rows[0].quote_number} accepted by client: ${body.client_name}`);
          return {
            success: true,
            message: 'Quotation accepted successfully! Thank you.',
            quotation: res.rows[0],
          };
        }
      } catch {
        continue;
      }
    }

    throw new NotFoundException('Quotation not found or link has expired');
  }

  // 8. Public Reject Quotation
  async publicRejectQuotation(token: string, reason?: string) {
    if (!token) throw new BadRequestException('Token required');

    const masterPool = this.dbManagerService.getMasterPool();
    const compRes = await masterPool.query(`SELECT db_name FROM companies WHERE is_active = true`);

    for (const comp of compRes.rows) {
      try {
        const pool = this.tenantPoolService.getPool(comp.db_name);
        await this.ensureTables(pool);

        const res = await pool.query(
          `UPDATE quotations 
           SET status = 'rejected',
               rejected_at = NOW(),
               rejection_reason = $1,
               updated_at = NOW()
           WHERE public_token = $2 AND is_deleted = false
           RETURNING *`,
          [reason || 'Client opted not to proceed', token]
        );

        if (res.rows.length > 0) {
          return {
            success: true,
            message: 'Quotation response recorded.',
            quotation: res.rows[0],
          };
        }
      } catch {
        continue;
      }
    }

    throw new NotFoundException('Quotation not found');
  }

  // 9. Convert Quotation to Invoice
  async convertQuotationToInvoice(pool: Pool, userId: string, quotationId: string) {
    await this.ensureTables(pool);
    const quote = await this.getQuotationById(pool, quotationId);

    // Check if already converted
    const existingInv = await pool.query(
      `SELECT * FROM invoices WHERE quotation_id = $1 AND is_deleted = false`,
      [quotationId]
    );
    if (existingInv.rows.length > 0) {
      return {
        message: 'Quotation was already converted to an invoice',
        invoice: existingInv.rows[0],
      };
    }

    const invoiceNumber = await this.generateInvoiceNumber(pool);
    const publicToken = `inv_${crypto.randomBytes(18).toString('hex')}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15); // Default 15 days due date

    const invRes = await pool.query(
      `INSERT INTO invoices 
        (invoice_number, public_token, lead_id, quotation_id, title, client_name, client_email, client_phone, client_address,
         items, subtotal, tax_amount, discount_amount, total_amount, paid_amount, due_amount,
         status, due_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, $14, 'unpaid', $15, $16, $17)
       RETURNING *`,
      [
        invoiceNumber,
        publicToken,
        quote.lead_id || null,
        quote.id,
        quote.title,
        quote.client_name,
        quote.client_email,
        quote.client_phone,
        quote.client_address,
        JSON.stringify(quote.items),
        quote.subtotal,
        quote.tax_amount,
        quote.discount_amount,
        quote.total_amount,
        dueDate.toISOString().split('T')[0],
        quote.notes || 'Converted directly from approved quotation ' + quote.quote_number,
        userId || null,
      ]
    );

    // Mark quotation status as converted
    await pool.query(
      `UPDATE quotations SET status = 'converted', updated_at = NOW() WHERE id = $1`,
      [quotationId]
    );

    return {
      message: 'Quotation successfully converted to Invoice!',
      invoice: invRes.rows[0],
    };
  }

  // ==========================================
  // INVOICES API
  // ==========================================

  // 10. List Invoices with Search, Filter & Pagination
  async getInvoices(
    pool: Pool,
    query: {
      search?: string;
      status?: string;
      leadId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    await this.ensureTables(pool);
    const { search, status, leadId, page = 1, limit = 20 } = query;
    const params: any[] = [];
    let idx = 1;
    const where: string[] = ['i.is_deleted = false'];

    if (status && status !== 'all') {
      where.push(`i.status = $${idx++}`);
      params.push(status);
    }

    if (leadId) {
      where.push(`i.lead_id = $${idx++}`);
      params.push(leadId);
    }

    if (search && search.trim()) {
      where.push(
        `(i.invoice_number ILIKE $${idx} OR i.title ILIKE $${idx} OR i.client_name ILIKE $${idx} OR i.client_email ILIKE $${idx})`
      );
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM invoices i ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    const dataRes = await pool.query(
      `SELECT 
        i.*,
        l.name AS lead_name,
        l.phone AS lead_phone,
        l.email AS lead_email,
        l.city AS lead_city,
        q.quote_number
       FROM invoices i
       LEFT JOIN leads l ON l.id = i.lead_id
       LEFT JOIN quotations q ON q.id = i.quotation_id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    // Summary Metrics
    const metricsRes = await pool.query(`
      SELECT 
        COUNT(*)::int AS total_invoices,
        COALESCE(SUM(total_amount), 0)::numeric AS total_billed,
        COALESCE(SUM(paid_amount), 0)::numeric AS total_paid,
        COALESCE(SUM(due_amount), 0)::numeric AS total_due,
        COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
        COUNT(*) FILTER (WHERE status = 'unpaid')::int AS unpaid_count,
        COUNT(*) FILTER (WHERE status = 'partial')::int AS partial_count,
        COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue_count
      FROM invoices
      WHERE is_deleted = false
    `);

    return {
      invoices: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      metrics: metricsRes.rows[0],
    };
  }

  // 11. Get Single Invoice by ID
  async getInvoiceById(pool: Pool, id: string) {
    await this.ensureTables(pool);
    const res = await pool.query(
      `SELECT 
        i.*,
        l.name AS lead_name,
        l.phone AS lead_phone,
        l.email AS lead_email,
        l.city AS lead_city,
        q.quote_number,
        u.name AS creator_name
       FROM invoices i
       LEFT JOIN leads l ON l.id = i.lead_id
       LEFT JOIN quotations q ON q.id = i.quotation_id
       LEFT JOIN users u ON u.id = i.created_by
       WHERE i.id = $1 AND i.is_deleted = false`,
      [id]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException('Invoice not found');
    }
    return res.rows[0];
  }

  // 12. Create Direct Invoice
  async createInvoice(
    pool: Pool,
    userId: string,
    data: {
      lead_id?: string;
      title: string;
      client_name: string;
      client_email?: string;
      client_phone?: string;
      client_address?: string;
      due_date?: string;
      items: LineItem[];
      discount_amount?: number;
      payment_mode?: string;
      transaction_id?: string;
      paid_amount?: number;
      status?: string;
      notes?: string;
    }
  ) {
    await this.ensureTables(pool);
    if (!data.title || !data.client_name) {
      throw new BadRequestException('Title and Client Name are required');
    }

    const items = data.items || [];
    let subtotal = 0;
    let taxAmount = 0;

    for (const item of items) {
      const lineSub = (Number(item.qty) || 1) * (Number(item.rate) || 0);
      const lineTax = (lineSub * (Number(item.tax_pct) || 0)) / 100;
      subtotal += lineSub;
      taxAmount += lineTax;
      item.amount = Math.round((lineSub + lineTax) * 100) / 100;
    }

    const discountAmount = Number(data.discount_amount) || 0;
    const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);
    const paidAmount = Number(data.paid_amount) || 0;
    const dueAmount = Math.max(0, totalAmount - paidAmount);

    let status = data.status || 'unpaid';
    if (paidAmount >= totalAmount && totalAmount > 0) {
      status = 'paid';
    } else if (paidAmount > 0 && paidAmount < totalAmount) {
      status = 'partial';
    }

    const invoiceNumber = await this.generateInvoiceNumber(pool);
    const publicToken = `inv_${crypto.randomBytes(18).toString('hex')}`;

    const res = await pool.query(
      `INSERT INTO invoices 
        (invoice_number, public_token, lead_id, title, client_name, client_email, client_phone, client_address,
         items, subtotal, tax_amount, discount_amount, total_amount, paid_amount, due_amount,
         status, due_date, payment_mode, transaction_id, notes, created_by, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
       RETURNING *`,
      [
        invoiceNumber,
        publicToken,
        data.lead_id || null,
        data.title.trim(),
        data.client_name.trim(),
        data.client_email || null,
        data.client_phone || null,
        data.client_address || null,
        JSON.stringify(items),
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        paidAmount,
        dueAmount,
        status,
        data.due_date || null,
        data.payment_mode || null,
        data.transaction_id || null,
        data.notes || null,
        userId || null,
        status === 'paid' ? new Date() : null,
      ]
    );

    return res.rows[0];
  }

  // 13. Record Payment on Invoice
  async recordInvoicePayment(
    pool: Pool,
    invoiceId: string,
    data: {
      amount: number;
      payment_mode: string;
      transaction_id?: string;
      notes?: string;
    }
  ) {
    await this.ensureTables(pool);
    const invoice = await this.getInvoiceById(pool, invoiceId);

    const newPaid = Number(invoice.paid_amount) + Number(data.amount);
    const total = Number(invoice.total_amount);
    const due = Math.max(0, total - newPaid);

    let newStatus = 'unpaid';
    if (newPaid >= total) {
      newStatus = 'paid';
    } else if (newPaid > 0) {
      newStatus = 'partial';
    }

    const res = await pool.query(
      `UPDATE invoices SET
        paid_amount = $1,
        due_amount = $2,
        status = $3,
        payment_mode = COALESCE($4, payment_mode),
        transaction_id = COALESCE($5, transaction_id),
        paid_at = CASE WHEN $3 = 'paid' THEN NOW() ELSE paid_at END,
        updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [newPaid, due, newStatus, data.payment_mode, data.transaction_id || null, invoiceId]
    );

    return res.rows[0];
  }

  // 14. Delete Invoice
  async deleteInvoice(pool: Pool, id: string) {
    await this.ensureTables(pool);
    await pool.query(`UPDATE invoices SET is_deleted = true, updated_at = NOW() WHERE id = $1`, [id]);
    return { success: true, message: 'Invoice deleted successfully' };
  }

  // 15. Public Get Invoice via Shared Web Link (No auth required)
  async getPublicInvoice(token: string) {
    if (!token) throw new BadRequestException('Token required');

    const masterPool = this.dbManagerService.getMasterPool();
    const compRes = await masterPool.query(`SELECT db_name FROM companies WHERE is_active = true`);

    for (const comp of compRes.rows) {
      try {
        const pool = this.tenantPoolService.getPool(comp.db_name);
        await this.ensureTables(pool);

        const res = await pool.query(
          `SELECT 
            i.*,
            l.name AS lead_name,
            l.phone AS lead_phone,
            l.email AS lead_email,
            l.city AS lead_city,
            q.quote_number
           FROM invoices i
           LEFT JOIN leads l ON l.id = i.lead_id
           LEFT JOIN quotations q ON q.id = i.quotation_id
           WHERE i.public_token = $1 AND i.is_deleted = false`,
          [token]
        );

        if (res.rows.length > 0) {
          const settingsRes = await pool.query(
            `SELECT value FROM settings WHERE key = 'about_company' LIMIT 1`
          );
          const company = settingsRes.rows[0]?.value || {
            companyName: 'DigiInk Solutions',
            brandName: 'DigiInk CRM',
            email: 'support@digiinksolutions.com',
            phone: '+91 9024154995',
            website: 'https://www.digiinksolutions.com',
            gstin: '08AGHPP4568R1ZD',
            addressLine1: '318 3rd and 4th, Metro Station New Aatish Market',
            addressLine2: 'Devi Nagar, Mansarovar, Jaipur, Rajasthan 302020',
            bankName: 'HDFC Bank',
            accountNumber: '50200012345678',
            ifscCode: 'HDFC0001234',
            upiId: 'digiink@hdfcbank',
          };

          return {
            invoice: res.rows[0],
            company,
            dbName: comp.db_name,
          };
        }
      } catch {
        continue;
      }
    }

    throw new NotFoundException('Invoice not found or link has expired');
  }
}

