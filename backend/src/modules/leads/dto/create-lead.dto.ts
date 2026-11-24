import {
  IsString,
  IsOptional,
  IsEmail,
  IsUUID,
  IsDateString,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';

// Helper to convert empty strings, null, or 'all' to undefined so @IsOptional() skips them properly
const EmptyToUndefined = () =>
  Transform(({ value }) =>
    typeof value === 'string' && (value.trim() === '' || value.trim().toLowerCase() === 'all')
      ? undefined
      : value ?? undefined,
  );

export class CreateLeadDto {
  @IsString({ message: 'First name is required' })
  first_name!: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  middle_name?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  last_name?: string;

  @IsString({ message: 'Phone number is required' })
  phone!: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID('4', { message: 'Invalid branch ID' })
  branch_id?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  gender?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString({}, { message: 'Invalid date of birth' })
  date_of_birth?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  city?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  country_code?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  lead_status?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  address?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  feedback?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  lead_received_on?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID('4', { message: 'Invalid status ID' })
  status_id?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  lead_from?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  lead_from_custom?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID('4', { message: 'Invalid campaign ID' })
  campaign_id?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  remark?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  refer_by?: string;

  @IsOptional()
  @IsObject()
  custom_data?: Record<string, any>;

  // Call / Followup time details
  @IsOptional()
  @EmptyToUndefined()
  @IsDateString({}, { message: 'Invalid followup date' })
  next_followup_date?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  followup_time_from?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  followup_time_to?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID('4', { message: 'Invalid counselor/agent ID' })
  assigned_to?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  followup_remark?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  photo_url?: string;
}
