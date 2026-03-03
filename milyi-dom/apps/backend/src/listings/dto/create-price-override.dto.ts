import { IsDateString, IsNumber, IsString, MaxLength, Min } from 'class-validator';

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
  price!: number;
}
