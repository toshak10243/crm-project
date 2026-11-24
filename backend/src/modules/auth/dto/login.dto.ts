import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @Transform(({ value, obj }) => value || obj?.identifier || '')
  @IsEmail({}, { message: 'Valid email required' })
  email!: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsString()
  @MinLength(6, { message: 'Password minimum 6 characters' })
  password!: string;

  @Transform(({ value, obj }) => value || obj?.companySlug || '')
  @IsString({ message: 'Company slug required' })
  slug!: string;

  @IsOptional()
  @IsString()
  companySlug?: string;
}
