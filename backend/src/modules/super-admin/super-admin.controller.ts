// Saare Super Admin routes yahan hain
// /api/super-admin/* prefix se start hote hain

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminLoginDto } from './dto/login.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from '../auth/auth.service';
import { InvoiceService } from '../../common/services/invoice.service';

@Controller('super-admin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly authService: AuthService,
    private readonly invoiceService: InvoiceService,
  ) {}

  // =============================================
  // AUTH ROUTES
  // =============================================

  // POST /api/super-admin/auth/login
  // Email, phone, ya username se login
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: SuperAdminLoginDto) {
    const result = await this.superAdminService.login(dto);
    return {
      data: result,
      message: 'Login successful',
    };
  }

  // POST /api/super-admin/auth/refresh
  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    const result = await this.superAdminService.refreshToken(refreshToken);
    return {
      data: result,
      message: 'Token refreshed',
    };
  }

  // POST /api/super-admin/auth/forgot-password
  @Post('auth/forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('identifier') identifier: string) {
    const result = await this.authService.superAdminForgotPassword(identifier);
    return {
      data: {
        userId: result.userId,
        email: result.email,
      },
      message: result.message,
    };
  }

  // POST /api/super-admin/auth/resend-otp
  @Post('auth/resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body('userId') userId: string) {
    const result = await this.authService.superAdminResendOtp(userId);
    return {
      data: null,
      message: result.message,
    };
  }

  // POST /api/super-admin/auth/reset-password
  @Post('auth/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body('userId') userId: string,
    @Body('otp') otp: string,
    @Body('newPassword') newPassword: string,
    @Body('confirmPassword') confirmPassword: string,
  ) {
    const result = await this.authService.superAdminResetPassword(
      userId,
      otp,
      newPassword,
      confirmPassword,
    );
    return {
      data: null,
      message: result.message,
    };
  }

  // =============================================
  // DASHBOARD
  // =============================================

  // GET /api/super-admin/dashboard
  @Get('dashboard')
  @UseGuards(SuperAdminGuard)
  async getDashboard() {
    const stats = await this.superAdminService.getDashboardStats();
    return {
      data: stats,
      message: 'Dashboard stats fetched',
    };
  }

  // =============================================
  // COMPANIES
  // =============================================

  // GET /api/super-admin/companies
  @Get('companies')
  @UseGuards(SuperAdminGuard)
  async getAllCompanies(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Query('plan') plan?: string,
  ) {
    const result = await this.superAdminService.getAllCompanies(
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
      plan,
    );
    return {
      data: result.data,
      meta: result.meta,
      message: 'Companies fetched successfully',
    };
  }

  // GET /api/super-admin/companies/:id
  @Get('companies/:id')
  @UseGuards(SuperAdminGuard)
  async getCompanyById(@Param('id') id: string) {
    const company = await this.superAdminService.getCompanyById(id);
    return {
      data: company,
      message: 'Company fetched successfully',
    };
  }

  // POST /api/super-admin/companies
  @Post('companies')
  @UseGuards(SuperAdminGuard)
  async createCompany(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await this.superAdminService.createCompany(dto, user.id, ip);
    return {
      data: result,
      message: result.message,
    };
  }

  // PATCH /api/super-admin/companies/:id/activate
  @Patch('companies/:id/activate')
  @UseGuards(SuperAdminGuard)
  async activateCompany(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const company = await this.superAdminService.activateCompany(id, user.id, ip);
    return {
      data: company,
      message: 'Company activated successfully',
    };
  }

  // PATCH /api/super-admin/companies/:id/deactivate
  @Patch('companies/:id/deactivate')
  @UseGuards(SuperAdminGuard)
  async deactivateCompany(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const company = await this.superAdminService.deactivateCompany(id, user.id, ip);
    return {
      data: company,
      message: 'Company deactivated successfully',
    };
  }

  // DELETE /api/super-admin/companies/:id
  @Delete('companies/:id')
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteCompany(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await this.superAdminService.deleteCompany(id, user.id, ip);
    return {
      data: result,
      message: result.message,
    };
  }

  // =============================================
  // PAYMENTS & SUBSCRIPTIONS
  // =============================================

  // GET /api/super-admin/audit-logs
  @Get('audit-logs')
  @UseGuards(SuperAdminGuard)
  async getAuditLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('action') action?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const result = await this.superAdminService.getAuditLogs(
      parseInt(page, 10),
      parseInt(limit, 10),
      action,
      fromDate,
      toDate,
    );
    return { data: result.data, meta: result.meta, message: 'Audit logs fetched' };
  }

  // GET /api/super-admin/audit-logs/export?format=csv
  @Get('audit-logs/export')
  @UseGuards(SuperAdminGuard)
  async exportAuditLogs(
    @Query('action') action: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Res() res: any,
  ) {
    const csv = await this.superAdminService.exportAuditLogs(action, fromDate, toDate);
    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // GET /api/super-admin/payment-history
  @Get('payment-history')
  @UseGuards(SuperAdminGuard)
  async getPaymentHistory(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const result = await this.superAdminService.getPaymentHistory(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
    return { data: result.data, meta: result.meta, message: 'Payment history fetched' };
  }

  // GET /api/super-admin/payments/pending
  // Saare pending payment requests
  @Get('payments/pending')
  @UseGuards(SuperAdminGuard)
  async getPendingPayments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const result = await this.superAdminService.getPendingPayments(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
    return {
      data: result.data,
      meta: result.meta,
      message: 'Pending payments fetched',
    };
  }

  // POST /api/super-admin/companies/:id/verify-payment
  // Payment verify karo aur subscription activate karo
  @Post('companies/:id/verify-payment')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  async verifyPayment(
    @Param('id') companyId: string,
    @CurrentUser() user: any,
    @Req() req: any,
    @Body() body: {
      paymentRequestId: string;
      plan: string;
      amount: number;
      notes?: string;
    },
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await this.superAdminService.verifyPayment(
      companyId,
      user.id,
      body,
      ip,
    );
    return {
      data: result,
      message: result.message,
    };
  }

  // POST /api/super-admin/payments/:id/reject
  // Payment reject karo
  @Post('payments/:id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  async rejectPayment(
    @Param('id') paymentRequestId: string,
    @CurrentUser() user: any,
    @Req() req: any,
    @Body('reason') reason: string,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await this.superAdminService.rejectPayment(
      paymentRequestId,
      user.id,
      reason,
      ip,
    );
    return {
      data: result,
      message: 'Payment request rejected',
    };
  }
  // GET /api/super-admin/invoices
@Get('invoices')
@UseGuards(SuperAdminGuard)
async getAllInvoices(
  @Query('page') page: string = '1',
  @Query('limit') limit: string = '20',
  @Query('companyId') companyId?: string,
) {
  const result = await this.invoiceService.getAllInvoices(
    parseInt(page, 10),
    parseInt(limit, 10),
    companyId,
  );
  return {
    data: result.data,
    meta: result.meta,
    message: 'Invoices fetched successfully',
  };
}
  // GET /api/super-admin/invoices/:id/download
  @Get('invoices/:id/download')
  @UseGuards(SuperAdminGuard)
  async downloadInvoice(
    @Param('id') id: string,
    @Res() res: any,
  ) {
    const fs = require('fs');
    const pool = this.invoiceService['dbManager'].getMasterPool();

    const result = await pool.query(
      `SELECT * FROM invoices WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = result.rows[0];

    if (!invoice.pdf_path || !fs.existsSync(invoice.pdf_path)) {
      return res.status(404).json({ success: false, message: 'PDF file not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoice_number}.pdf"`,
    );
    fs.createReadStream(invoice.pdf_path).pipe(res);
  }
  // GET /api/super-admin/companies/:id/users
@Get('companies/:id/users')
@UseGuards(SuperAdminGuard)
async getCompanyUsers(@Param('id') id: string) {
  const result = await this.superAdminService.getCompanyUsers(id);
  return {
    data: result,
    message: 'Company users fetched successfully',
  };
}

// GET /api/super-admin/companies/:id/usage
@Get('companies/:id/usage')
@UseGuards(SuperAdminGuard)
async getCompanyUsage(@Param('id') id: string) {
  const result = await this.superAdminService.getCompanyUsage(id);
  return {
    data: result,
    message: 'Company usage fetched successfully',
  };
}

// PATCH /api/super-admin/companies/:id/users/:userId/toggle
@Patch('companies/:id/users/:userId/toggle')
@UseGuards(SuperAdminGuard)
async toggleCompanyUser(
  @Param('id') companyId: string,
  @Param('userId') userId: string,
  @Body('isActive') isActive: boolean,
) {
  const result = await this.superAdminService.toggleCompanyUser(companyId, userId, isActive);
  return {
    data: result,
    message: result.message,
  };
}

// POST /api/super-admin/companies/:id/users/:userId/force-reset
@Post('companies/:id/users/:userId/force-reset')
@HttpCode(HttpStatus.OK)
@UseGuards(SuperAdminGuard)
async forcePasswordReset(
  @Param('id') companyId: string,
  @Param('userId') userId: string,
) {
  const result = await this.superAdminService.forcePasswordReset(companyId, userId);
  return {
    data: result,
    message: result.message,
  };
}

// GET /api/super-admin/health
@Get('health')
@UseGuards(SuperAdminGuard)
async getCompanyHealth() {
  const result = await this.superAdminService.getCompanyHealthStats();
  return {
    data: result,
    message: 'Health stats fetched',
  };
}
// GET /api/super-admin/expiring
@Get('expiring')
@UseGuards(SuperAdminGuard)
async getExpiringCompanies() {
  const result = await this.superAdminService.getExpiringCompanies();
  return {
    data: result,
    message: 'Expiring companies fetched',
  };
}
// GET /api/super-admin/email-templates
@Get('email-templates')
@UseGuards(SuperAdminGuard)
async getEmailTemplates() {
  const result = await this.superAdminService.getEmailTemplates();
  return { data: result, message: 'Email templates fetched' };
}

// GET /api/super-admin/whatsapp-templates
@Get('whatsapp-templates')
@UseGuards(SuperAdminGuard)
async getWhatsappTemplates() {
  const result = await this.superAdminService.getWhatsappTemplates();
  return { data: result, message: 'WhatsApp templates fetched' };
}

// PATCH /api/super-admin/email-templates/:key
@Patch('email-templates/:key')
@UseGuards(SuperAdminGuard)
async updateEmailTemplate(
  @Param('key') key: string,
  @Body() body: { subject?: string; body?: string },
) {
  const result = await this.superAdminService.updateEmailTemplate(key, body);
  return { data: result, message: 'Email template updated' };
}

// PATCH /api/super-admin/whatsapp-templates/:key
@Patch('whatsapp-templates/:key')
@UseGuards(SuperAdminGuard)
async updateWhatsappTemplate(
  @Param('key') key: string,
  @Body() body: { body: string },
) {
  const result = await this.superAdminService.updateWhatsappTemplate(key, body);
  return { data: result, message: 'WhatsApp template updated' };
}
// GET /api/super-admin/companies/:id/template-data
@Get('companies/:id/template-data')
@UseGuards(SuperAdminGuard)
async getCompanyTemplateData(@Param('id') id: string) {
  const result = await this.superAdminService.getCompanyTemplateData(id);
  return { data: result, message: 'Template data fetched' };
}

// POST /api/super-admin/companies/:id/send-template-email
@Post('companies/:id/send-template-email')
@HttpCode(HttpStatus.OK)
@UseGuards(SuperAdminGuard)
async sendTemplateEmail(
  @Param('id') companyId: string,
  @Body() body: { templateKey: string; extraData?: Record<string, string> },
) {
  const result = await this.superAdminService.sendTemplateEmail(
    companyId,
    body.templateKey,
    body.extraData,
  );
  return { data: result, message: result.message };
}

// POST /api/super-admin/email-templates
@Post('email-templates')
@UseGuards(SuperAdminGuard)
async createEmailTemplate(
  @Body() body: { key: string; name: string; subject: string; body?: string; description?: string; variables?: string[] },
) {
  const result = await this.superAdminService.createEmailTemplate(body);
  return { data: result, message: 'Email template created' };
}

// DELETE /api/super-admin/email-templates/:key
@Delete('email-templates/:key')
@HttpCode(HttpStatus.OK)
@UseGuards(SuperAdminGuard)
async deleteEmailTemplate(@Param('key') key: string) {
  const result = await this.superAdminService.deleteEmailTemplate(key);
  return { data: result, message: 'Email template deleted' };
}

// POST /api/super-admin/whatsapp-templates
@Post('whatsapp-templates')
@UseGuards(SuperAdminGuard)
async createWhatsappTemplate(
  @Body() body: { key: string; name: string; body: string; description?: string; variables?: string[] },
) {
  const result = await this.superAdminService.createWhatsappTemplate(body);
  return { data: result, message: 'WhatsApp template created' };
}

// DELETE /api/super-admin/whatsapp-templates/:key
@Delete('whatsapp-templates/:key')
@HttpCode(HttpStatus.OK)
@UseGuards(SuperAdminGuard)
async deleteWhatsappTemplate(@Param('key') key: string) {
  const result = await this.superAdminService.deleteWhatsappTemplate(key);
  return { data: result, message: 'WhatsApp template deleted' };
}
// POST /api/super-admin/invoices/:id/resend
@Post('invoices/:id/resend')
@HttpCode(HttpStatus.OK)
@UseGuards(SuperAdminGuard)
async resendInvoice(@Param('id') id: string) {
  const result = await this.superAdminService.resendInvoiceEmail(id);
  return { data: result, message: 'Invoice email resent successfully' };
}
@Get('system-health')
@UseGuards(SuperAdminGuard)
async getSystemHealth() {
  const result = await this.superAdminService.getSystemHealth();
  return { data: result, message: 'System health fetched' };
}
// GET /api/super-admin/system-settings
@Get('system-settings')
@UseGuards(SuperAdminGuard)
async getSystemSettings() {
  const result = await this.superAdminService.getSystemSettings();
  return { data: result, message: 'System settings fetched' };
}

// PATCH /api/super-admin/system-settings/:key
@Patch('system-settings/:key')
@UseGuards(SuperAdminGuard)
async updateSystemSetting(
  @Param('key') key: string,
  @Body() body: { value: string },
) {
  const result = await this.superAdminService.updateSystemSetting(key, body.value);
  return { data: result, message: 'Setting updated' };
}

// POST /api/super-admin/system-settings
@Post('system-settings')
@UseGuards(SuperAdminGuard)
async createSystemSetting(
  @Body() body: { key: string; value: string; label: string; description?: string; type?: string },
) {
  const result = await this.superAdminService.createSystemSetting(body);
  return { data: result, message: 'Setting created' };
}

// DELETE /api/super-admin/system-settings/:key
@Delete('system-settings/:key')
@HttpCode(HttpStatus.OK)
@UseGuards(SuperAdminGuard)
async deleteSystemSetting(@Param('key') key: string) {
  const result = await this.superAdminService.deleteSystemSetting(key);
  return { data: result, message: 'Setting deleted' };
}
@Get('revenue-analytics')
@UseGuards(SuperAdminGuard)
async getRevenueAnalytics() {
  const result = await this.superAdminService.getRevenueAnalytics();
  return { data: result, message: 'Revenue analytics fetched' };
}
// GET /api/super-admin/security
@Get('security')
@UseGuards(SuperAdminGuard)
async getSecurityData() {
  const result = await this.superAdminService.getSecurityData();
  return { data: result, message: 'Security data fetched' };
}

// POST /api/super-admin/security/logout-all
@Post('security/logout-all')
@HttpCode(HttpStatus.OK)
@UseGuards(SuperAdminGuard)
async logoutAllSessions(@CurrentUser() user: any) {
  const result = await this.superAdminService.logoutAllSessions(user.id);
  return { data: result, message: result.message };
}

// DELETE /api/super-admin/security/sessions/:id
@Delete('security/sessions/:id')
@HttpCode(HttpStatus.OK)
@UseGuards(SuperAdminGuard)
async logoutSession(
  @Param('id') tokenId: string,
  @CurrentUser() user: any,
) {
  const result = await this.superAdminService.logoutSession(tokenId, user.id);
  return { data: result, message: result.message };
}
// GET /api/super-admin/background-jobs
@Get('background-jobs')
@UseGuards(SuperAdminGuard)
async getBackgroundJobs() {
  const result = await this.superAdminService.getBackgroundJobsStats();
  return { data: result, message: 'Background jobs fetched' };
}

// POST /api/super-admin/background-jobs/:id/retry
@Post('background-jobs/:id/retry')
@HttpCode(HttpStatus.OK)
@UseGuards(SuperAdminGuard)
async retryJob(@Param('id') id: string) {
  const result = await this.superAdminService.retryJob(id);
  return { data: result, message: 'Job queued for retry' };
}
}