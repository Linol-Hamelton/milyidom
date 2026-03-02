import { IsEnum } from 'class-validator';
import { ListingStatus } from '@prisma/client';

export class ModerateListingDto {
  @IsEnum(ListingStatus)
  status: ListingStatus;
}
