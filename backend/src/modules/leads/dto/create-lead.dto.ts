import {
  IsString,
  IsOptional,
  IsEmail,
  IsUUID,
  IsDateString,
  IsObject,
} from 'class-validator';

export class CreateLeadDto {
  @IsString({ message: 'First name is required' })
  first_name!: string;

  @IsOptional()
  @IsString()
  middle_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsString({ message: 'Phone number is required' })
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid branch ID' })
  branch_id?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country_code?: string;

  @IsOptional()
  @IsString()
  lead_status?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsString()
  lead_received_on?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid status ID' })
  status_id?: string;

  @IsOptional()
  @IsString()
  lead_from?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid campaign ID' })
  campaign_id?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  refer_by?: string;

  @IsOptional()
  @IsObject()
  custom_data?: Record<string, any>;

  // Call / Followup time details
  @IsOptional()
  @IsDateString()
  next_followup_date?: string;

  @IsOptional()
  @IsString()
  followup_time_from?: string;

  @IsOptional()
  @IsString()
  followup_time_to?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid counselor/agent ID' })
  assigned_to?: string;

  @IsOptional()
  @IsString()
  followup_remark?: string;
}

