import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Valid email required' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password minimum 6 characters' })
  password!: string;

  @IsString({ message: 'Company slug required' })
  slug!: string;
}