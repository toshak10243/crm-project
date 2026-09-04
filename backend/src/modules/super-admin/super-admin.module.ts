import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { DbManagerService } from '../../database/db-manager.service';
import { TenantPoolService } from '../../database/tenant-pool.service';
import { MailService } from '../../common/services/mail.service';
import { AuthService } from '../auth/auth.service';
import { RedisService } from '../../common/services/redis.service';
import { SubscriptionCronService } from './subscription.cron';

// Super Admin module -- company management, subscriptions, cron jobs
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SuperAdminController],
  providers: [
    SuperAdminService,
    AuthService,
    DbManagerService,
    TenantPoolService,
    MailService,
    RedisService,
    SubscriptionCronService,
  ],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}