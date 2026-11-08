import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import envConfig from './config/env.config';
import { DatabaseModule } from './database/database.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LeadsModule } from './modules/leads/leads.module';
import { IvrModule } from './modules/ivr/ivr.module';
import { BranchesModule } from './modules/branches/branches.module';
import { FormFieldsModule } from './modules/form-fields/form-fields.module';
import { SettingsModule } from './modules/settings/settings.module';
import { WorkReportModule } from './modules/work-report/work-report.module';
import { WaDaddyModule } from './modules/wadaddy/wadaddy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    SuperAdminModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    IvrModule,
    BranchesModule,
    FormFieldsModule,
    SettingsModule,
    WorkReportModule,
    WaDaddyModule,
  ],
})
export class AppModule {}
