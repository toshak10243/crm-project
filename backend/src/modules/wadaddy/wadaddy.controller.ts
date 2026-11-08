import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WaDaddyService } from './wadaddy.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentDb } from '../../common/decorators/current-db.decorator';
import { Pool } from 'pg';

@Controller('wadaddy')
@UseGuards(JwtGuard)
export class WaDaddyController {
  constructor(private readonly waDaddyService: WaDaddyService) {}

  // 1. CONTACTS
  @Get('contacts')
  async getContacts(
    @CurrentDb() dbPool: Pool,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('group') group?: string,
  ) {
    const data = await this.waDaddyService.getContacts(
      dbPool,
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
      group,
    );
    return { data, message: 'Contacts fetched successfully' };
  }

  @Post('contacts')
  async createContact(
    @CurrentDb() dbPool: Pool,
    @Body() body: { full_name: string; phone: string; email?: string; group_name?: string },
  ) {
    const data = await this.waDaddyService.createContact(dbPool, body);
    return { data, message: 'Contact created successfully' };
  }

  @Delete('contacts/:id')
  async deleteContact(@CurrentDb() dbPool: Pool, @Param('id') id: string) {
    await this.waDaddyService.deleteContact(dbPool, id);
    return { message: 'Contact deleted successfully' };
  }

  // 2. CAMPAIGNS
  @Get('campaigns')
  async getCampaigns(
    @CurrentDb() dbPool: Pool,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    const data = await this.waDaddyService.getCampaigns(
      dbPool,
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
    );
    return { data, message: 'Campaigns fetched successfully' };
  }

  @Post('campaigns')
  async createCampaign(
    @CurrentDb() dbPool: Pool,
    @Body() body: { campaign_name: string; contacts_count?: number },
  ) {
    const data = await this.waDaddyService.createCampaign(dbPool, body);
    return { data, message: 'Campaign created successfully' };
  }

  // 3. TEMPLATES (Meta Approved Styles)
  @Get('templates')
  async getTemplates(
    @CurrentDb() dbPool: Pool,
    @Query('status') status?: string,
  ) {
    const data = await this.waDaddyService.getTemplates(dbPool, status);
    return { data, message: 'Templates fetched successfully' };
  }

  // 4. CHAT (Conversations & Instant Messaging)
  @Get('chats')
  async getChats(@CurrentDb() dbPool: Pool) {
    const data = await this.waDaddyService.getChatThreads(dbPool);
    return { data, message: 'Chat threads fetched successfully' };
  }

  @Get('chats/:contactId/messages')
  async getMessages(
    @CurrentDb() dbPool: Pool,
    @Param('contactId') contactId: string,
  ) {
    const data = await this.waDaddyService.getMessages(dbPool, contactId);
    return { data, message: 'Messages fetched successfully' };
  }

  @Post('chats/:contactId/messages')
  async sendMessage(
    @CurrentDb() dbPool: Pool,
    @Param('contactId') contactId: string,
    @Body() body: { text: string; sender?: string },
  ) {
    const data = await this.waDaddyService.sendMessage(
      dbPool,
      contactId,
      body.text,
      body.sender || 'agent',
    );
    return { data, message: 'Message sent successfully' };
  }
}

