import { IsString, MinLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

// Super Admin login -- email, phone, ya username teeno se login ho sakta hai
export class SuperAdminLoginDto {
  @Transform(({ value, obj }) => value || obj?.email || '')
  @IsString({ message: 'Email, phone or username is required' })
  identifier!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  @MinLength(6, { message: 'Password minimum 6 characters' })
  password!: string;
}
