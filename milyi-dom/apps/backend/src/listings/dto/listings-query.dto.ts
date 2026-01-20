import { IntersectionType } from '@nestjs/mapped-types';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SearchListingsDto } from './search-listings.dto';

export class ListingsQueryDto extends IntersectionType(
  SearchListingsDto,
  PaginationDto,
) {}
