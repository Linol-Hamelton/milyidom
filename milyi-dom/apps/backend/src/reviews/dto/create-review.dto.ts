import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsString()
  bookingId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  cleanliness!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  communication!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  checkIn!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  accuracy!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  location!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  value!: number;
}
