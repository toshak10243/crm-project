import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentDb } from '../../common/decorators/current-db.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Pool } from 'pg';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ==========================================
  // PUBLIC ENDPOINTS (No login required)
  // Used by clients via shared web links
  // ==========================================

  // 1. Client views quotation via shared web link
  @Get('quotations/public/:token')
  async getPublicQuotation(@Param('token') token: string) {
    const result = await this.financeService.getPublicQuotation(token);
    return { success: true, data: result };
  }

  // 2. Client accepts quotation online
  @Post('quotations/public/:token/accept')
  async publicAcceptQuotation(
    @Param('token') token: string,
    @Body() body: { client_name: string; remarks?: string }
  ) {
    const result = await this.financeService.publicAcceptQuotation(token, body);
    return { success: true, data: result };
  }

  // 3. Client rejects quotation online
  @Post('quotations/public/:token/reject')
  async publicRejectQuotation(
    @Param('token') token: string,
    @Body() body: { reason?: string }
  ) {
    const result = await this.financeService.publicRejectQuotation(token, body?.reason);
    return { success: true, data: result };
  }

  // 4. Client views/prints invoice via shared link
  @Get('invoices/public/:token')
  async getPublicInvoice(@Param('token') token: string) {
    const result = await this.financeService.getPublicInvoice(token);
    return { success: true, data: result };
  }

  // ==========================================
  // PROTECTED CRM ENDPOINTS (Requires JWT)
  // ==========================================

  // QUOTATIONS

  @Get('quotations')
  @UseGuards(JwtGuard)
  async getQuotations(
    @CurrentDb() pool: Pool,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('leadId') leadId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const result = await this.financeService.getQuotations(pool, {
      search,
      status,
      leadId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return { success: true, data: result };
  }

  @Get('quotations/:id')
  @UseGuards(JwtGuard)
  async getQuotationById(@CurrentDb() pool: Pool, @Param('id') id: string) {
    const result = await this.financeService.getQuotationById(pool, id);
    return { success: true, data: result };
  }

  @Post('quotations')
  @UseGuards(JwtGuard)
  async createQuotation(
    @CurrentDb() pool: Pool,
    @CurrentUser() user: any,
    @Body() body: any
  ) {
    const result = await this.financeService.createQuotation(pool, user.id, body);
    return { success: true, data: result, message: 'Quotation created successfully' };
  }

  @Patch('quotations/:id')
  @UseGuards(JwtGuard)
  async updateQuotation(
    @CurrentDb() pool: Pool,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const result = await this.financeService.updateQuotation(pool, id, body);
    return { success: true, data: result, message: 'Quotation updated successfully' };
  }

  @Delete('quotations/:id')
  @UseGuards(JwtGuard)
  async deleteQuotation(@CurrentDb() pool: Pool, @Param('id') id: string) {
    const result = await this.financeService.deleteQuotation(pool, id);
    return { success: true, data: result };
  }

  @Post('quotations/:id/convert')
  @UseGuards(JwtGuard)
  async convertQuotationToInvoice(
    @CurrentDb() pool: Pool,
    @CurrentUser() user: any,
    @Param('id') id: string
  ) {
    const result = await this.financeService.convertQuotationToInvoice(pool, user.id, id);
    return { success: true, data: result };
  }

  // INVOICES

  @Get('invoices')
  @UseGuards(JwtGuard)
  async getInvoices(
    @CurrentDb() pool: Pool,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('leadId') leadId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const result = await this.financeService.getInvoices(pool, {
      search,
      status,
      leadId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return { success: true, data: result };
  }

  @Get('invoices/:id')
  @UseGuards(JwtGuard)
  async getInvoiceById(@CurrentDb() pool: Pool, @Param('id') id: string) {
    const result = await this.financeService.getInvoiceById(pool, id);
    return { success: true, data: result };
  }

  @Post('invoices')
  @UseGuards(JwtGuard)
  async createInvoice(
    @CurrentDb() pool: Pool,
    @CurrentUser() user: any,
    @Body() body: any
  ) {
    const result = await this.financeService.createInvoice(pool, user.id, body);
    return { success: true, data: result, message: 'Invoice created successfully' };
  }

  @Patch('invoices/:id/payment')
  @UseGuards(JwtGuard)
  async recordInvoicePayment(
    @CurrentDb() pool: Pool,
    @Param('id') id: string,
    @Body() body: { amount: number; payment_mode: string; transaction_id?: string; notes?: string }
  ) {
    const result = await this.financeService.recordInvoicePayment(pool, id, body);
    return { success: true, data: result, message: 'Payment recorded successfully' };
  }

  @Delete('invoices/:id')
  @UseGuards(JwtGuard)
  async deleteInvoice(@CurrentDb() pool: Pool, @Param('id') id: string) {
    const result = await this.financeService.deleteInvoice(pool, id);
    return { success: true, data: result };
  }
}

