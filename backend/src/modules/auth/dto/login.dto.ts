import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Valid email required' })
  email!: string;

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
