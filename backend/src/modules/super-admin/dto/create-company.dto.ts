import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

// Naya company create karne ke liye validation
export class CreateCompanyDto {
  @IsString()
  @MinLength(2, { message: 'Company name minimum 2 characters' })
  @MaxLength(255)
  name: string;

  // Slug — URL safe hona chahiye, sirf lowercase letters, numbers, hyphens
  // Ye DB name mein bhi use hoga: crm_client_{slug}
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug can only have lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsString()
  @MinLength(2)
  adminName: string;

  @IsEmail({}, { message: 'Valid admin email required' })
  adminEmail: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}