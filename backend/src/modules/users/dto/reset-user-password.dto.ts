import { IsString, IsUUID } from 'class-validator';

export class ResetUserPasswordDto {
  @IsUUID()
  userId!: string;
}