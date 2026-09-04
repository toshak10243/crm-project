import {
  IsEmail,
  IsString,
  IsOptional,
  IsIn,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail({}, { message: 'Valid email required' })
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsIn(['admin', 'manager', 'agent'], {
    message: 'Role must be admin, manager or agent',
  })
  role!: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}