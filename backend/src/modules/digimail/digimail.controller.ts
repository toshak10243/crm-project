import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { DigimailService } from './digimail.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentDb } from '../../common/decorators/current-db.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Pool } from 'pg';
import { Request, Response } from 'express';

// Transparent 1x1 GIF base64
const TRACKING_PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

@Controller('digimail')
export class DigimailController {
  constructor(private readonly digimailService: DigimailService) {}

  // 1. PUBLIC TRACKING PIXEL (No auth guard needed so email clients can trigger it)
  @Get('track/:token')
  async trackOpen(
    @Param('token') token: string,
    @Res() res: Response
  ) {
    if (token) {
      await this.digimailService.trackOpenPublic(token);
    }
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    return res.end(TRACKING_PIXEL_GIF);
  }

  // 2. GET RECIPIENTS (Fetched directly from Leads table)
  @Get('recipients')
  @UseGuards(JwtGuard)
  async getRecipients(
    @CurrentDb() pool: Pool,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const l = limit ? parseInt(limit, 10) : 500;
    const o = offset ? parseInt(offset, 10) : 0;
    const result = await this.digimailService.getRecipients(pool, search, l, o);
    return { success: true, data: result };
  }

  // 3. GET EMAIL TEMPLATES
  @Get('templates')
  @UseGuards(JwtGuard)
  async getTemplates(@CurrentDb() pool: Pool) {
    const templates = await this.digimailService.getEmailTemplates(pool);
    return { success: true, data: templates };
  }

  // 4. CREATE EMAIL TEMPLATE
  @Post('templates')
  @UseGuards(JwtGuard)
  async createTemplate(
    @CurrentDb() pool: Pool,
    @Body() body: { name: string; subject: string; body: string }
  ) {
    const template = await this.digimailService.createEmailTemplate(pool, body);
    return { success: true, message: 'Template created successfully', data: template };
  }

  // 5. SEND BULK OR SINGLE EMAIL
  @Post('send')
  @UseGuards(JwtGuard)
  async sendBulk(
    @CurrentDb() pool: Pool,
    @CurrentUser() user: any,
    @Body()
    body: {
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
    const userId = user?.id;
    const result = await this.digimailService.sendBulkEmail(pool, userId, body);
    return { success: true, ...result };
  }

  // 6. GET CAMPAIGNS
  @Get('campaigns')
  @UseGuards(JwtGuard)
  async getCampaigns(
    @CurrentDb() pool: Pool,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 15;
    const result = await this.digimailService.getCampaigns(pool, p, l);
    return { success: true, data: result };
  }

  // 7. GET LOGS
  @Get('logs')
  @UseGuards(JwtGuard)
  async getLogs(
    @CurrentDb() pool: Pool,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    const result = await this.digimailService.getLogs(pool, p, l, campaignId, status, search);
    return { success: true, data: result };
  }

  // 8. GET STATS
  @Get('stats')
  @UseGuards(JwtGuard)
  async getStats(@CurrentDb() pool: Pool) {
    const stats = await this.digimailService.getStats(pool);
    return { success: true, data: stats };
  }
}
