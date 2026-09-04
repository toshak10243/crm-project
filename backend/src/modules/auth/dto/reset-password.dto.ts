import { IsEmail, IsString } from 'class-validator';

// Admin kisi user ka password reset kare
export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  slug: string;
}