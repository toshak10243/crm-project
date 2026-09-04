import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// Saare user management routes yahan hain
// Admin aur Manager access kar sakte hain
@Controller('users')
@UseGuards(JwtGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/users
  // Saare users list karo -- search, filter, pagination
  @Get()
  @Roles('admin', 'manager')
  async getAllUsers(
    @CurrentUser() user: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    const result = await this.usersService.getAllUsers(
      user.dbName,
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
      role,
      isActive !== undefined ? isActive === 'true' : undefined,
    );

    return {
      data: result.data,
      meta: result.meta,
      message: 'Users fetched successfully',
    };
  }

  // GET /api/users/:id
  @Get(':id')
  @Roles('admin', 'manager')
  async getUserById(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.usersService.getUserById(user.dbName, id);
    return {
      data: result,
      message: 'User fetched successfully',
    };
  }

  // POST /api/users
  // Naya user create karo -- sirf Admin
  @Post()
  @Roles('admin')
  async createUser(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    const result = await this.usersService.createUser(
      user.dbName,
      dto,
      user.id,
      user.companySlug,
    );
    return {
      data: result,
      message: 'User created successfully. Credentials sent via email.',
    };
  }

  // PATCH /api/users/:id
  // User update karo
  @Patch(':id')
  @Roles('admin', 'manager')
  async updateUser(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const result = await this.usersService.updateUser(
      user.dbName,
      id,
      dto,
      user.id,
      user.role,
    );
    return {
      data: result,
      message: 'User updated successfully',
    };
  }

  // PATCH /api/users/:id/activate
  @Patch(':id/activate')
  @Roles('admin')
  async activateUser(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.usersService.activateUser(user.dbName, id);
    return {
      data: result,
      message: 'User activated successfully',
    };
  }

  // PATCH /api/users/:id/deactivate
  @Patch(':id/deactivate')
  @Roles('admin')
  async deactivateUser(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.usersService.deactivateUser(user.dbName, id);
    return {
      data: result,
      message: 'User deactivated successfully',
    };
  }

  // POST /api/users/:id/reset-password
  // Admin ya Manager password reset kare
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'manager')
  async resetPassword(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.usersService.resetUserPassword(
      user.dbName,
      id,
      user.role,
    );
    return {
      data: null,
      message: result.message,
    };
  }

  // GET /api/users/departments/list
  @Get('departments/list')
  @Roles('admin', 'manager')
  async getDepartments(@CurrentUser() user: any) {
    const result = await this.usersService.getDepartments(user.dbName);
    return {
      data: result,
      message: 'Departments fetched successfully',
    };
  }

  // POST /api/users/departments
  // Naya department create karo -- sirf Admin
  @Post('departments')
  @Roles('admin')
  async createDepartment(
    @CurrentUser() user: any,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    const result = await this.usersService.createDepartment(
      user.dbName,
      name,
      description,
    );
    return {
      data: result,
      message: 'Department created successfully',
    };
  }
}