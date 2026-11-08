import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentDb } from '../../common/decorators/current-db.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Pool } from 'pg';

@Controller('settings')
@UseGuards(JwtGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // 1. GET /api/settings/all - Get all setting masters
  @Get('all')
  async getAllSettings(@CurrentDb() dbPool: Pool) {
    const data = await this.settingsService.getAll(dbPool);
    return { data, message: 'Settings fetched successfully' };
  }

  // 2. LEAD STATUSES
  @Post('lead-statuses')
  async createStatus(
    @CurrentDb() dbPool: Pool,
    @Body() body: { name: string; color: string },
  ) {
    const data = await this.settingsService.createStatus(dbPool, body);
    return { data, message: 'Lead status created' };
  }

  @Patch('lead-statuses/:id')
  async updateStatus(
    @CurrentDb() dbPool: Pool,
    @Param('id') id: string,
    @Body() body: { name?: string; color?: string },
  ) {
    const data = await this.settingsService.updateStatus(dbPool, id, body);
    return { data, message: 'Lead status updated' };
  }

  @Delete('lead-statuses/:id')
  async deleteStatus(@CurrentDb() dbPool: Pool, @Param('id') id: string) {
    await this.settingsService.deleteStatus(dbPool, id);
    return { message: 'Lead status deleted' };
  }

  // 3. TEMPLATES (WhatsApp & Email)
  @Post('templates')
  async createTemplate(
    @CurrentDb() dbPool: Pool,
    @Body() body: { type: string; name: string; subject?: string; body: string },
  ) {
    const data = await this.settingsService.createTemplate(dbPool, body);
    return { data, message: 'Template created' };
  }

  @Patch('templates/:id')
  async updateTemplate(
    @CurrentDb() dbPool: Pool,
    @Param('id') id: string,
    @Body() body: { name?: string; subject?: string; body?: string },
  ) {
    const data = await this.settingsService.updateTemplate(dbPool, id, body);
    return { data, message: 'Template updated' };
  }

  @Delete('templates/:id')
  async deleteTemplate(@CurrentDb() dbPool: Pool, @Param('id') id: string) {
    await this.settingsService.deleteTemplate(dbPool, id);
    return { message: 'Template deleted' };
  }

  // 4. LEAD SOURCES (Lead From)
  @Post('lead-sources')
  async createSource(
    @CurrentDb() dbPool: Pool,
    @Body() body: { name: string; assigned_manager_id?: string },
  ) {
    const data = await this.settingsService.createSource(dbPool, body);
    return { data, message: 'Lead source created' };
  }

  @Patch('lead-sources/:id')
  async updateSource(
    @CurrentDb() dbPool: Pool,
    @Param('id') id: string,
    @Body() body: { name?: string; assigned_manager_id?: string },
  ) {
    const data = await this.settingsService.updateSource(dbPool, id, body);
    return { data, message: 'Lead source updated' };
  }

  @Delete('lead-sources/:id')
  async deleteSource(@CurrentDb() dbPool: Pool, @Param('id') id: string) {
    await this.settingsService.deleteSource(dbPool, id);
    return { message: 'Lead source deleted' };
  }

  // 5. SYSTEM SETTINGS TOGGLE (Auto-Assign Leads)
  @Patch('toggle-auto-assign')
  async toggleAutoAssign(
    @CurrentDb() dbPool: Pool,
    @Body() body: { enabled: boolean },
  ) {
    const data = await this.settingsService.setAutoAssign(dbPool, body.enabled);
    return { data, message: 'Auto assign setting updated' };
  }

  // 6. ABOUT COMPANY
  @Get('about-company')
  async getAboutCompany(@CurrentDb() dbPool: Pool) {
    const data = await this.settingsService.getAboutCompany(dbPool);
    return { data, message: 'About company fetched successfully' };
  }

  @Patch('about-company')
  async updateAboutCompany(
    @CurrentDb() dbPool: Pool,
    @Body() body: Record<string, any>,
  ) {
    const data = await this.settingsService.updateAboutCompany(dbPool, body);
    return { data, message: 'Company details saved successfully' };
  }
}

