import {
  IsEmail,
  IsString,
  IsOptional,
  IsIn,
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

  @IsOptional()
  @IsIn(['admin', 'manager', 'agent', 'sales_executive', 'extra_admin'], {
    message: 'Role must be admin, manager, agent, sales_executive or extra_admin',
  })
  role?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
