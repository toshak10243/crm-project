import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  IsEmail,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsIn(['admin', 'manager', 'agent'])
  role?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}