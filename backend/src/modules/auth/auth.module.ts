import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DbManagerService } from '../../database/db-manager.service';
import { TenantPoolService } from '../../database/tenant-pool.service';
import { MailService } from '../../common/services/mail.service';
import { RedisService } from '../../common/services/redis.service';

// Auth module -- Redis bhi add ki rate limiting aur OTP ke liye
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    DbManagerService,
    TenantPoolService,
    MailService,
    RedisService,
  ],
  exports: [AuthService, RedisService],
})
export class AuthModule {}