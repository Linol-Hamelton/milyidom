import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { AuditAction } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class GetAuditLogDto extends PaginationDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
