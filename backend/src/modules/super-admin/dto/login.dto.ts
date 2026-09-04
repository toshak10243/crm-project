import { IsString, MinLength } from 'class-validator';

// Super Admin login -- email, phone, ya username teeno se login ho sakta hai
export class SuperAdminLoginDto {
  @IsString({ message: 'Email, phone or username is required' })
  identifier!: string;

  @IsString()
  @MinLength(6, { message: 'Password minimum 6 characters' })
  password!: string;
}