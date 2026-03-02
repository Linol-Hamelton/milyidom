import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ListingStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class GetAdminListingsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
