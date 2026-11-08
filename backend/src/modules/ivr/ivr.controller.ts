import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IvrService } from './ivr.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentDb } from '../../common/decorators/current-db.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Pool } from 'pg';

@Controller('ivr')
export class IvrController {
  constructor(private readonly ivrService: IvrService) {}

  // GET /api/ivr/calls - Get call records (incoming or outgoing) from DB
  @Get('calls')
  @UseGuards(JwtGuard)
  async getCalls(@CurrentDb() dbPool: Pool, @Query() query: any) {
    const callType = query.type === 'incoming' ? 'incoming' : 'outgoing';
    const limit = Math.min(parseInt(query.limit || '10', 10), 100);
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['call_type = $1'];
    const values: any[] = [callType];
    let paramIndex = 2;

    if (query.start_date) {
      conditions.push(`created_at >= $${paramIndex}::date`);
      values.push(query.start_date);
      paramIndex++;
    }

    if (query.end_date) {
      conditions.push(`created_at <= ($${paramIndex}::date + interval '1 day')`);
      values.push(query.end_date);
      paramIndex++;
    }

    if (query.search) {
      conditions.push(
        `(caller ILIKE $${paramIndex} OR receiver ILIKE $${paramIndex} OR lead_name ILIKE $${paramIndex})`,
      );
      values.push(`%${query.search}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total count
    const countRes = await dbPool.query(`SELECT COUNT(*) FROM ivr_calls ${whereClause}`, values);
    const totalRecords = parseInt(countRes.rows[0].count, 10);

    // Records
    const recordsRes = await dbPool.query(
      `SELECT * FROM ivr_calls ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset],
    );

    return {
      data: {
        calls: recordsRes.rows,
        total: totalRecords,
        page,
        limit,
      },
      message: 'IVR calls fetched successfully',
    };
  }

  // POST /api/ivr/click-to-call - Initiates call between agent & customer
  @Post('click-to-call')
  @UseGuards(JwtGuard)
  async clickToCall(
    @CurrentDb() dbPool: Pool,
    @CurrentUser() user: any,
    @Body() body: { customerPhone: string; leadId?: string; leadName?: string },
  ) {
    const result = await this.ivrService.initiateClickToCall(dbPool, {
      agentPhone: user.phone || '9999999999',
      customerPhone: body.customerPhone,
      leadId: body.leadId,
      leadName: body.leadName,
      agentName: user.name || 'Sales Agent',
    });

    return {
      data: result,
      message: 'Click to call request processed',
    };
  }

  // Webhook for Vi CPaaS / Cloud Telephony webhook callback (Public callback)
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleIvrWebhook(@CurrentDb() dbPool: Pool, @Body() payload: any) {
    const result = await this.ivrService.handleWebhook(dbPool, payload);
    return { status: 'success', data: result };
  }
}
