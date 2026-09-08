// Invoice Service -- PDF banata hai aur email bhejta hai
// Jab bhi Super Admin payment verify kare -- invoice automatically generate hoti hai

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DbManagerService } from '../../database/db-manager.service';
import { MailService } from './mail.service';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

@Injectable()
export class InvoiceService {
  constructor(
    private dbManager: DbManagerService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  // Invoice number generate karo -- INV-2026-0001 format
  private async generateInvoiceNumber(pool: any): Promise<string> {
    const year = new Date().getFullYear();
    const result = await pool.query(
      `SELECT COUNT(*) FROM invoices WHERE EXTRACT(YEAR FROM created_at) = $1`,
      [year],
    );
    const count = parseInt(result.rows[0].count, 10) + 1;
    return `INV-${year}-${String(count).padStart(4, '0')}`;
  }

  // Plan label get karo
  private getPlanLabel(plan: string): string {
    const map: Record<string, string> = {
      '1month': '1 Month Subscription',
      '3months': '3 Months Subscription',
      '6months': '6 Months Subscription',
      '1year': '1 Year Subscription',
    };
    return map[plan] || plan;
  }

  // Logo ko base64 mein convert karo -- PDF mein embed hoga
  private getLogoBase64(): string {
    try {
      const logoPath = path.join(process.cwd(), this.configService.get('company.logo') || 'uploads/logo.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const ext = path.extname(logoPath).toLowerCase().replace('.', '');
        const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
        return `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
      }
    } catch (e) {
      // Logo nahi mila -- fallback text use hoga
    }
    return '';
  }

  // Invoice HTML template -- Tight single-page, no header/footer chrome
  private generateInvoiceHTML(data: {
    invoiceNumber: string;
    invoiceDate: string;
    companyName: string;
    adminName: string;
    adminEmail: string;
    adminPhone?: string;
    adminAddress?: string;
    plan: string;
    planLabel: string;
    amount: number;
    gstAmount: number;
    totalAmount: number;
    subscriptionFrom: string;
    subscriptionTo: string;
    paymentMode?: string;
    referenceNo?: string;
    nextBillingDate: string;
    ourCompanyName: string;
    ourCompanyEmail: string;
    ourCompanyPhone: string;
    ourCompanyAddress: string;
    ourCompanyGst: string;
    ourCompanyWebsite: string;
    logoBase64: string;
  }): string {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);

    const logoHtml = data.logoBase64
      ? `<img src="${data.logoBase64}" alt="Logo" style="width:42px;height:42px;object-fit:contain;border-radius:8px;display:block;" />`
      : `<div style="width:42px;height:42px;background:#111;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:18px;flex-shrink:0;">${data.ourCompanyName.charAt(0).toUpperCase()}</div>`;

    const paymentRows = [
      data.paymentMode
        ? `<div class="pdet"><span class="pdet-label">Payment method</span><span class="pdet-val">${data.paymentMode.replace(/_/g, ' ')}</span></div>`
        : '',
      data.referenceNo
        ? `<div class="pdet"><span class="pdet-label">Reference no.</span><span class="pdet-val">${data.referenceNo}</span></div>`
        : '',
      `<div class="pdet"><span class="pdet-label">Payment date</span><span class="pdet-val">${data.invoiceDate}</span></div>`,
      `<div class="pdet"><span class="pdet-label">Amount paid</span><span class="pdet-val">${formatCurrency(data.totalAmount)}</span></div>`,
    ].join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    /* ── Reset ── */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* ── Page: A4, no browser header/footer, single page ── */
    @page {
      size: A4;
      margin: 0;
    }

    html, body {
      width: 210mm;
      height: 297mm;
      overflow: hidden;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      color: #111;
      background: #fff;
      padding: 28px 48px 24px 48px;
      display: flex;
      flex-direction: column;
      height: 297mm;
    }

    /* ── Header ── */
    .inv-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    .logo-row { display: flex; align-items: center; gap: 10px; }
    .co-name { font-size: 16px; font-weight: 600; color: #111; }
    .inv-title-block { text-align: right; }
    .inv-word { font-size: 24px; font-weight: 600; color: #111; letter-spacing: -0.5px; }
    .inv-num { font-size: 12px; color: #999; margin-top: 2px; }

    /* ── Divider ── */
    .divider { height: 1px; background: #ebebeb; margin-bottom: 14px; }

    /* ── Amount Due Hero ── */
    .due-hero { margin-bottom: 14px; }
    .due-lbl { font-size: 10.5px; color: #999; margin-bottom: 3px; }
    .due-amt { font-size: 30px; font-weight: 600; color: #111; letter-spacing: -1px; }
    .due-date-line { font-size: 11px; color: #aaa; margin-top: 2px; }

    /* ── Billing Columns ── */
    .billing-cols {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      margin-bottom: 14px;
      padding-bottom: 14px;
      border-bottom: 1px solid #ebebeb;
    }
    .bcol h4 {
      font-size: 9px; color: #bbb; font-weight: 500;
      text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px;
    }
    .bcol .bname { font-size: 13px; font-weight: 600; color: #111; margin-bottom: 3px; }
    .bcol p { font-size: 11px; color: #666; line-height: 1.65; }

    /* ── Dates Strip ── */
    .dates-strip {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr;
      padding: 12px 0;
      border-top: 1px solid #ebebeb;
      border-bottom: 1px solid #ebebeb;
      margin-bottom: 14px;
    }
    .ditem label {
      font-size: 9px; color: #bbb; text-transform: uppercase;
      letter-spacing: 0.07em; display: block; margin-bottom: 4px; font-weight: 500;
    }
    .ditem span { font-size: 12px; font-weight: 500; color: #111; }

    /* ── Line Items ── */
    .tbl-head {
      display: grid;
      grid-template-columns: 1fr 60px 100px;
      padding: 0 0 8px;
      border-bottom: 1px solid #ebebeb;
    }
    .tbl-head span {
      font-size: 9px; color: #bbb; font-weight: 500;
      text-transform: uppercase; letter-spacing: 0.07em;
    }
    .tbl-head span:nth-child(2),
    .tbl-head span:nth-child(3) { text-align: right; }

    .tbl-row {
      display: grid;
      grid-template-columns: 1fr 60px 100px;
      padding: 12px 0;
      border-bottom: 1px solid #f5f5f5;
      align-items: start;
    }
    .iname { font-size: 12px; font-weight: 500; color: #111; margin-bottom: 2px; }
    .isub { font-size: 10.5px; color: #bbb; }
    .iqty, .iamt {
      font-size: 12px; color: #111; text-align: right;
      font-variant-numeric: tabular-nums;
    }

    /* ── Totals ── */
    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 2px; margin-bottom: 14px; }
    .totals-inner { width: 220px; }
    .trow {
      display: flex; justify-content: space-between;
      padding: 6px 0; border-bottom: 1px solid #f5f5f5; font-size: 11.5px;
    }
    .trow label { color: #999; }
    .trow span { color: #111; font-variant-numeric: tabular-nums; }
    .trow.grand {
      border-bottom: none; border-top: 1px solid #ebebeb;
      margin-top: 3px; padding-top: 10px;
    }
    .trow.grand label { font-size: 13px; font-weight: 600; color: #111; }
    .trow.grand span { font-size: 13px; font-weight: 600; color: #111; }

    /* ── Payment ── */
    .pay-section {
      padding-top: 14px;
      border-top: 1px solid #ebebeb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 14px;
    }
    .paid-pill {
      display: inline-flex; align-items: center; gap: 6px;
      background: #f0faf4; color: #1a7a43;
      font-size: 11px; font-weight: 600;
      padding: 4px 12px; border-radius: 20px; border: 1px solid #c3ecd2;
      flex-shrink: 0;
    }
    .paid-dot { width: 6px; height: 6px; border-radius: 50%; background: #1a7a43; flex-shrink: 0; }
    .pay-details { display: flex; gap: 24px; flex-wrap: wrap; }
    .pdet { display: flex; flex-direction: column; gap: 3px; }
    .pdet-label {
      font-size: 9px; color: #bbb; text-transform: uppercase;
      letter-spacing: 0.07em; font-weight: 500;
    }
    .pdet-val { font-size: 11.5px; font-weight: 500; color: #111; }

    /* ── Footer -- pushed to bottom ── */
    .spacer { flex: 1; }
    .inv-footer {
      padding-top: 12px;
      border-top: 1px solid #ebebeb;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .fnote { font-size: 10px; color: #ccc; line-height: 1.8; max-width: 280px; }
    .fcontact { text-align: right; }
    .fcontact p { font-size: 10.5px; color: #bbb; line-height: 1.8; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="inv-header">
    <div class="logo-row">
      ${logoHtml}
      <span class="co-name">${data.ourCompanyName}</span>
    </div>
    <div class="inv-title-block">
      <div class="inv-word">Invoice</div>
      <div class="inv-num">${data.invoiceNumber}</div>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Amount Due Hero -->
  <div class="due-hero">
    <div class="due-lbl">Amount due</div>
    <div class="due-amt">${formatCurrency(data.totalAmount)}</div>
    <div class="due-date-line">Due ${data.invoiceDate}</div>
  </div>

  <!-- Billing Columns -->
  <div class="billing-cols">
    <div class="bcol">
      <h4>From</h4>
      <div class="bname">${data.ourCompanyName}</div>
      ${data.ourCompanyAddress ? `<p>${data.ourCompanyAddress}</p>` : ''}
      <p>${data.ourCompanyEmail}</p>
      ${data.ourCompanyPhone ? `<p>${data.ourCompanyPhone}</p>` : ''}
      ${data.ourCompanyWebsite ? `<p>${data.ourCompanyWebsite}</p>` : ''}
      ${data.ourCompanyGst ? `<p>GST: ${data.ourCompanyGst}</p>` : ''}
    </div>
    <div class="bcol">
      <h4>Billed to</h4>
      <div class="bname">${data.companyName}</div>
      <p>${data.adminName}</p>
      <p>${data.adminEmail}</p>
      ${data.adminPhone ? `<p>${data.adminPhone}</p>` : ''}
      ${data.adminAddress ? `<p>${data.adminAddress}</p>` : ''}
    </div>
    <div class="bcol">
      <h4>Invoice details</h4>
      <p>Invoice date<br><strong style="color:#111;font-weight:500;font-size:12px;">${data.invoiceDate}</strong></p>
      <p style="margin-top:8px">Invoice no.<br><strong style="color:#111;font-weight:500;font-size:12px;">${data.invoiceNumber}</strong></p>
    </div>
  </div>

  <!-- Subscription / Plan / Next Billing Strip -->
  <div class="dates-strip">
    <div class="ditem">
      <label>Subscription period</label>
      <span>${data.subscriptionFrom} – ${data.subscriptionTo}</span>
    </div>
    <div class="ditem">
      <label>Plan</label>
      <span>${data.planLabel}</span>
    </div>
    <div class="ditem">
      <label>Next billing</label>
      <span>${data.nextBillingDate}</span>
    </div>
  </div>

  <!-- Line Items -->
  <div class="tbl-head">
    <span>Description</span>
    <span>Qty</span>
    <span>Amount</span>
  </div>
  <div class="tbl-row">
    <div>
      <div class="iname">CRM Subscription – ${data.planLabel}</div>
      <div class="isub">Lead management platform · Full access</div>
    </div>
    <div class="iqty">1</div>
    <div class="iamt">${formatCurrency(data.amount)}</div>
  </div>

  <!-- Totals -->
  <div class="totals-wrap">
    <div class="totals-inner">
      <div class="trow"><label>Subtotal</label><span>${formatCurrency(data.amount)}</span></div>
      <div class="trow"><label>GST (0%)</label><span>${formatCurrency(data.gstAmount)}</span></div>
      <div class="trow grand"><label>Total due</label><span>${formatCurrency(data.totalAmount)}</span></div>
    </div>
  </div>

  <!-- Payment Status -->
  <div class="pay-section">
    <div class="paid-pill">
      <div class="paid-dot"></div>
      Paid
    </div>
    <div class="pay-details">
      ${paymentRows}
    </div>
  </div>

  <!-- Spacer pushes footer to bottom -->
  <div class="spacer"></div>

  <!-- Footer -->
  <div class="inv-footer">
    <div class="fnote">
      Computer-generated invoice. No signature required.${data.ourCompanyGst ? `<br>GST No: ${data.ourCompanyGst}` : ''}<br>Generated on ${data.invoiceDate}
    </div>
    <div class="fcontact">
      <p>${data.ourCompanyEmail}</p>
      ${data.ourCompanyPhone ? `<p>${data.ourCompanyPhone}</p>` : ''}
      ${data.ourCompanyWebsite ? `<p>${data.ourCompanyWebsite}</p>` : ''}
    </div>
  </div>

</body>
</html>`;
  }

  // System Chrome se PDF banao -- header/footer disable karo
  private async generatePdfWithChrome(html: string, outputPath: string): Promise<Buffer | null> {
    const tempHtmlPath = outputPath.replace('.pdf', '_temp.html');
    fs.writeFileSync(tempHtmlPath, html, 'utf8');

    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      process.env.CHROME_PATH || '',
    ].filter(Boolean);

    let success = false;
    for (const chromePath of chromePaths) {
      if (fs.existsSync(chromePath)) {
        try {
          const fileUrl = `file:///${tempHtmlPath.replace(/\\/g, '/')}`;
          execSync(
            `"${chromePath}" --headless=new --disable-gpu --no-sandbox --print-to-pdf="${outputPath}" --no-pdf-header-footer --print-to-pdf-no-header "${fileUrl}"`,
            { timeout: 30000, stdio: 'ignore' }
          );
          success = true;
          break;
        } catch (e) {
          continue;
        }
      }
    }

    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }

    if (success && fs.existsSync(outputPath)) {
      return fs.readFileSync(outputPath);
    }

    return null;
  }

  // Invoice create karo -- PDF banao -- email bhejo
  async createAndSendInvoice(data: {
    companyId: string;
    companyName: string;
    adminName: string;
    adminEmail: string;
    adminPhone?: string;
    adminAddress?: string;
    plan: string;
    amount: number;
    paymentMode?: string;
    referenceNo?: string;
    notes?: string;
    subscriptionFrom: Date;
    subscriptionTo: Date;
    superAdminId: string;
  }): Promise<{ invoiceNumber: string; invoicePath: string }> {
    const pool = this.dbManager.getMasterPool();

    // Our company details from env
    const ourCompanyName = this.configService.get<string>('company.name') || 'CRM System';
    const ourCompanyEmail = this.configService.get<string>('company.email') || '';
    const ourCompanyPhone = this.configService.get<string>('company.phone') || '';
    const ourCompanyAddress = this.configService.get<string>('company.address') || '';
    const ourCompanyGst = this.configService.get<string>('company.gst') || '';
    const ourCompanyWebsite = this.configService.get<string>('company.website') || '';
    const logoBase64 = this.getLogoBase64();

    const invoiceNumber = await this.generateInvoiceNumber(pool);
    const invoiceDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    const planLabel = this.getPlanLabel(data.plan);
    const gstAmount = 0;
    const totalAmount = (data.amount || 0) + gstAmount;

    const subscriptionFrom = data.subscriptionFrom.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const subscriptionTo = data.subscriptionTo.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    const html = this.generateInvoiceHTML({
      invoiceNumber, invoiceDate,
      companyName: data.companyName,
      adminName: data.adminName,
      adminEmail: data.adminEmail,
      adminPhone: data.adminPhone,
      adminAddress: data.adminAddress,
      plan: data.plan, planLabel,
      amount: data.amount || 0,
      gstAmount, totalAmount,
      subscriptionFrom, subscriptionTo,
      paymentMode: data.paymentMode,
      referenceNo: data.referenceNo,
      nextBillingDate: subscriptionTo,
      ourCompanyName, ourCompanyEmail,
      ourCompanyPhone, ourCompanyAddress,
      ourCompanyGst, ourCompanyWebsite,
      logoBase64,
    });

    let pdfBuffer: Buffer | null = null;
    let invoicePath = '';

    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const fileName = `${invoiceNumber.replace(/-/g, '_')}.pdf`;
      invoicePath = path.join(uploadsDir, fileName);
      pdfBuffer = await this.generatePdfWithChrome(html, invoicePath);
      if (pdfBuffer) {
        console.log(`Invoice PDF created: ${invoicePath}`);
      } else {
        console.log('Chrome not found -- PDF skipped');
        invoicePath = '';
      }
    } catch (error: any) {
      console.error('PDF generation failed:', error.message);
      invoicePath = '';
    }

    // DB mein save karo
    await pool.query(
      `INSERT INTO invoices
       (invoice_number, company_id, company_name, admin_name, admin_email,
        plan, plan_label, amount, gst_amount, total_amount, currency,
        payment_mode, reference_no, subscription_from, subscription_to,
        pdf_path, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'INR',$11,$12,$13,$14,$15,$16,$17)`,
      [
        invoiceNumber, data.companyId, data.companyName, data.adminName,
        data.adminEmail, data.plan || '1month', planLabel || 'Subscription',
        data.amount || 0, gstAmount, totalAmount,
        data.paymentMode || null, data.referenceNo || null,
        data.subscriptionFrom, data.subscriptionTo,
        invoicePath || null, data.notes || null, data.superAdminId,
      ],
    );

    // Email bhejo
    await this.mailService.sendInvoiceEmail(
      data.adminEmail, data.adminName, data.companyName,
      invoiceNumber, planLabel, totalAmount,
      subscriptionFrom, subscriptionTo, pdfBuffer,
    );

    return { invoiceNumber, invoicePath };
  }

  // Saari invoices list
  async getAllInvoices(page: number = 1, limit: number = 20, companyId?: string) {
    const pool = this.dbManager.getMasterPool();
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM invoices ${companyId ? 'WHERE company_id = $1' : ''}`,
      companyId ? [companyId] : [],
    );

    const result = await pool.query(
      `SELECT * FROM invoices ${companyId ? 'WHERE company_id = $3' : ''}
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      companyId ? [limit, offset, companyId] : [limit, offset],
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
}