import { Global, Module } from '@nestjs/common';
import { DbManagerService } from './db-manager.service';
import { TenantPoolService } from './tenant-pool.service';

@Global()
@Module({
  providers: [DbManagerService, TenantPoolService],
  exports: [DbManagerService, TenantPoolService],
})
export class DatabaseModule {}

