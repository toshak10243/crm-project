import { IsString, MinLength, IsOptional } from 'class-validator';

export class UnifiedLoginDto {
  @IsString({ message: 'Email, phone, or username is required' })
  identifier!: string;

  @IsString()
  @MinLength(6, { message: 'Password minimum 6 characters' })
  password!: string;

  @IsOptional()
  @IsString()
  slug?: string;
}

