import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkReportService } from './work-report.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentDb } from '../../common/decorators/current-db.decorator';
import { Pool } from 'pg';

@Controller('work-report')
@UseGuards(JwtGuard)
export class WorkReportController {
  constructor(private readonly workReportService: WorkReportService) {}

  // 1. GET /api/work-report/managers - List all managers & sales reps
  @Get('managers')
  async getManagers(@CurrentDb() dbPool: Pool) {
    const data = await this.workReportService.getManagers(dbPool);
    return { data, message: 'Managers fetched successfully' };
  }

  // 2. GET /api/work-report/data - Get detailed work report (summary, status breakdown, and lead details)
  @Get('data')
  async getReportData(
    @CurrentDb() dbPool: Pool,
    @Query('date') date?: string,
    @Query('managerId') managerId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const data = await this.workReportService.getReportData(
      dbPool,
      date,
      managerId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
    return { data, message: 'Work report data fetched successfully' };
  }
}

