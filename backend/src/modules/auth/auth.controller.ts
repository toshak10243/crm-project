import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/login
  // Email, phone, ya username se login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const result = await this.authService.login(dto, ipAddress, userAgent);
    return {
      data: result,
      message: 'Login successful',
    };
  }

  // POST /api/auth/refresh
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    const result = await this.authService.refreshToken(refreshToken);
    return {
      data: result,
      message: 'Token refreshed',
    };
  }

  // POST /api/auth/logout
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  async logout(
    @CurrentUser() user: any,
    @Body('refreshToken') refreshToken: string,
  ) {
    await this.authService.logout(user.id, refreshToken, user.dbName);
    return {
      data: null,
      message: 'Logged out successfully',
    };
  }

  // GET /api/auth/me
  @Get('me')
  @UseGuards(JwtGuard)
  async getProfile(@CurrentUser() user: any) {
    const profile = await this.authService.getProfile(user.id, user.dbName);
    return {
      data: profile,
      message: 'Profile fetched',
    };
  }

  // POST /api/auth/change-password
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.id, user.dbName, dto);
    return {
      data: null,
      message: 'Password changed successfully',
    };
  }

  // POST /api/auth/forgot-password
  // Email, phone, ya username daalo -- OTP aayega
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body('identifier') identifier: string,
    @Body('slug') slug: string,
  ) {
    const result = await this.authService.forgotPassword(identifier, slug);
    return {
      data: {
        userId: result.userId,
        email: result.email,
      },
      message: result.message,
    };
  }

  // POST /api/auth/resend-otp
  // 60 seconds ke baad resend allow hoga
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(
    @Body('userId') userId: string,
    @Body('slug') slug: string,
  ) {
    // Slug se dbName nikalo
    const masterPool = (this.authService as any).dbManager.getMasterPool();
    const companyResult = await masterPool.query(
      `SELECT db_name FROM companies WHERE slug = $1`,
      [slug],
    );

    if (companyResult.rows.length === 0) {
      return {
        data: null,
        message: 'Invalid request',
      };
    }

    const result = await this.authService.resendOtp(
      userId,
      companyResult.rows[0].db_name,
    );
    return {
      data: null,
      message: result.message,
    };
  }

  // POST /api/auth/reset-password
  // OTP verify karke naya password set karo
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body('userId') userId: string,
    @Body('slug') slug: string,
    @Body('otp') otp: string,
    @Body('newPassword') newPassword: string,
    @Body('confirmPassword') confirmPassword: string,
  ) {
    const result = await this.authService.resetPasswordWithOtp(
      userId,
      slug,
      otp,
      newPassword,
      confirmPassword,
    );
    return {
      data: null,
      message: result.message,
    };
  }
}