import { Module } from '@nestjs/common';
import { WaDaddyController } from './wadaddy.controller';
import { WaDaddyService } from './wadaddy.service';

@Module({
  controllers: [WaDaddyController],
  providers: [WaDaddyService],
  exports: [WaDaddyService],
})
export class WaDaddyModule {}

