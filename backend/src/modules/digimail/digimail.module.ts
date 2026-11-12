import { Module } from '@nestjs/common';
import { DigimailService } from './digimail.service';
import { DigimailController } from './digimail.controller';

@Module({
  controllers: [DigimailController],
  providers: [DigimailService],
  exports: [DigimailService],
})
export class DigimailModule {}
