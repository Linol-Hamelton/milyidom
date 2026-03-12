import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { DisputeStatus } from '@prisma/client';

export class ResolveDisputeDto {
  @IsEnum(DisputeStatus)
  status: DisputeStatus;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  adminNotes?: string;
}
