import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentDb } from '../../common/decorators/current-db.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Pool } from 'pg';

@Controller('leads')
@UseGuards(JwtGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // GET /api/leads/options - Fetch dropdown masters for lead form & filters
  @Get('options')
  async getOptions(@CurrentDb() dbPool: Pool) {
    const options = await this.leadsService.getFormOptions(dbPool);
    return {
      data: options,
      message: 'Lead form options fetched successfully',
    };
  }

  // GET /api/leads - Query paginated leads with all filters
  @Get()
  async getLeads(@CurrentDb() dbPool: Pool, @Query() query: any) {
    const result = await this.leadsService.getLeads(dbPool, query);
    return {
      data: result,
      message: 'Leads fetched successfully',
    };
  }

  // POST /api/leads - Create new lead
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLead(
    @CurrentDb() dbPool: Pool,
    @CurrentUser() user: any,
    @Body() dto: CreateLeadDto,
  ) {
    const lead = await this.leadsService.createLead(dbPool, dto, user.id);
    return {
      data: lead,
      message: 'Lead created successfully',
    };
  }

  // POST /api/leads/bulk - Bulk operations (delete, assign, followup)
  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async bulkUpdate(
    @CurrentDb() dbPool: Pool,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const res = await this.leadsService.bulkUpdate(dbPool, body, user.id);
    return {
      data: res,
      message: res.message || 'Bulk operation completed',
    };
  }

  // POST /api/leads/:id/remarks - Add new remark (Enter to save)
  @Post(':id/remarks')
  async addRemark(
    @CurrentDb() dbPool: Pool,
    @CurrentUser() user: any,
    @Param('id') leadId: string,
    @Body('remark') remark: string,
  ) {
    const data = await this.leadsService.addRemark(dbPool, leadId, remark, user);
    return {
      data,
      message: 'Remark added successfully',
    };
  }

  // GET /api/leads/:id/remarks - Get all remarks history (Read more modal)
  @Get(':id/remarks')
  async getLeadRemarks(
    @CurrentDb() dbPool: Pool,
    @Param('id') leadId: string,
  ) {
    const data = await this.leadsService.getLeadRemarks(dbPool, leadId);
    return {
      data,
      message: 'Lead remarks fetched successfully',
    };
  }

  // GET /api/leads/:id - Get single lead details for View Lead page
  @Get(':id')
  async getLeadById(@CurrentDb() dbPool: Pool, @Param('id') id: string) {
    const lead = await this.leadsService.getLeadById(dbPool, id);
    return {
      data: lead,
      message: 'Lead fetched successfully',
    };
  }

  // POST /api/leads/import - Bulk import leads from CSV/Excel
  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importLeads(
    @CurrentDb() dbPool: Pool,
    @CurrentUser() user: any,
    @Body('leads') leads: any[],
  ) {
    const res = await this.leadsService.importLeads(dbPool, leads, user.id);
    return {
      data: res,
      message: res.message,
    };
  }

  // PATCH /api/leads/:id - Update lead details from Edit Lead modal
  @Patch(':id')
  async updateLead(
    @CurrentDb() dbPool: Pool,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const lead = await this.leadsService.updateLead(dbPool, id, body, user);
    return {
      data: lead,
      message: 'Lead updated successfully',
    };
  }

  // DELETE /api/leads/:id - Soft delete lead
  @Delete(':id')
  async deleteLead(@CurrentDb() dbPool: Pool, @Param('id') id: string) {
    const res = await this.leadsService.deleteLead(dbPool, id);
    return {
      data: res,
      message: 'Lead deleted successfully',
    };
  }
}

