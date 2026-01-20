import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ListingImageDto } from './listing-image.dto';

export class CreateListingDto {
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  summary?: string;

  @IsString()
  @MaxLength(60)
  propertyType!: string;

  @IsInt()
  @IsPositive()
  guests!: number;

  @IsInt()
  @Min(0)
  bedrooms!: number;

  @IsInt()
  @IsPositive()
  beds!: number;

  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(20)
  bathrooms!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  basePrice!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cleaningFee?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  serviceFee?: number;

  @IsOptional()
  @IsBoolean()
  instantBook?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  checkInFrom?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  checkOutUntil?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minNights?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxNights?: number;

  @IsString()
  @MaxLength(120)
  addressLine1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  addressLine2?: string;

  @IsString()
  @MaxLength(80)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsString()
  @MaxLength(80)
  country!: string;

  @IsOptional()
  @Matches(/^[A-Za-z0-9-\s]{2,12}$/)
  postalCode?: string;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  amenityIds?: number[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => ListingImageDto)
  images!: ListingImageDto[];
}
