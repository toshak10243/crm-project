import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MailService } from '../../common/services/mail.service';
import { TenantPoolService } from '../../database/tenant-pool.service';

// Users module -- team management
@Module({
  controllers: [UsersController],
  providers: [UsersService, MailService, TenantPoolService],
  exports: [UsersService],
})
export class UsersModule {}