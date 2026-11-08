import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryLeadsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsString()
  updated_on?: string;

  @IsOptional()
  @IsString()
  status_id?: string;

  @IsOptional()
  @IsString()
  manager_id?: string;
}

export class BulkUpdateLeadsDto {
  lead_ids!: string[];

  @IsOptional()
  @IsString()
  status_id?: string;

  @IsOptional()
  @IsString()
  assigned_to?: string;

  @IsOptional()
  @IsString()
  next_followup_date?: string;

  @IsOptional()
  @IsString()
  followup_time_from?: string;

  @IsOptional()
  @IsString()
  followup_remark?: string;
}

