import { IsString, MinLength, Matches } from 'class-validator';

// Password change karne ke liye validation
export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  // New password strong hona chahiye
  @IsString()
  @MinLength(8, { message: 'Password minimum 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Password must have uppercase, lowercase, number and special character',
    },
  )
  newPassword: string;

  @IsString()
  confirmPassword: string;
}