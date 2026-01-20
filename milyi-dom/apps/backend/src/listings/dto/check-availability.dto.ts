import { IsDateString, IsNotEmpty } from 'class-validator';

export class CheckAvailabilityDto {
  @IsNotEmpty()
  @IsDateString()
  checkIn: string;

  @IsNotEmpty()
  @IsDateString()
  checkOut: string;
}

export class AvailabilityResponseDto {
  available: boolean;
  conflictingBookings?: Array<{
    checkIn: string;
    checkOut: string;
  }>;
}
