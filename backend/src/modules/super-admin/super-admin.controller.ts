// Saare Super Admin routes yahan hain
// /api/super-admin/* prefix se start hote hain

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminLoginDto } from './dto/login.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from '../auth/auth.service';

@Controller('super-admin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly authService: AuthService,
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
  ) {
    const result = await this.superAdminService.createCompany(dto, user.id);
    return {
      data: result,
      message: result.message,
    };
  }

  // PATCH /api/super-admin/companies/:id/activate
  @Patch('companies/:id/activate')
  @UseGuards(SuperAdminGuard)
  async activateCompany(@Param('id') id: string) {
    const company = await this.superAdminService.activateCompany(id);
    return {
      data: company,
      message: 'Company activated successfully',
    };
  }

  // PATCH /api/super-admin/companies/:id/deactivate
  @Patch('companies/:id/deactivate')
  @UseGuards(SuperAdminGuard)
  async deactivateCompany(@Param('id') id: string) {
    const company = await this.superAdminService.deactivateCompany(id);
    return {
      data: company,
      message: 'Company deactivated successfully',
    };
  }

  // =============================================
  // PAYMENTS & SUBSCRIPTIONS
  // =============================================

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
    @Body() body: {
      paymentRequestId: string;
      plan: string;
      amount: number;
      notes?: string;
    },
  ) {
    const result = await this.superAdminService.verifyPayment(
      companyId,
      user.id,
      body,
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
    @Body('reason') reason: string,
  ) {
    const result = await this.superAdminService.rejectPayment(
      paymentRequestId,
      user.id,
      reason,
    );
    return {
      data: result,
      message: 'Payment request rejected',
    };
  }
}