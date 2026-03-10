import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DisputeStatus } from '@prisma/client';

export class ResolveDisputeDto {
  @IsEnum(DisputeStatus)
  status: DisputeStatus;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}
