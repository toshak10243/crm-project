import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import envConfig from './config/env.config';
import { DbManagerService } from './database/db-manager.service';
import { TenantPoolService } from './database/tenant-pool.service';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    ScheduleModule.forRoot(),
    SuperAdminModule,
    AuthModule,
    UsersModule,
  ],
  providers: [DbManagerService, TenantPoolService],
  exports: [DbManagerService, TenantPoolService],
})
export class AppModule {}