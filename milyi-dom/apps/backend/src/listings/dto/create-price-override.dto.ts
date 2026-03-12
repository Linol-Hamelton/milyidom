import { IsDateString, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePriceOverrideDto {
  @IsString()
  @MaxLength(100)
  label!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsNumber()
  @Min(100)
  @Max(10_000_000)
  price!: number;
}
