import { Module } from '@nestjs/common';
import { FormFieldsController } from './form-fields.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [FormFieldsController],
})
export class FormFieldsModule {}

