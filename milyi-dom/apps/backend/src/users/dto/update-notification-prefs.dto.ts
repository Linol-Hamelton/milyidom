import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPrefsDto {
  @IsOptional()
  @IsBoolean()
  notifEmailBookings?: boolean;

  @IsOptional()
  @IsBoolean()
  notifEmailMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  notifEmailSavedSearches?: boolean;

  @IsOptional()
  @IsBoolean()
  notifEmailMarketing?: boolean;
}
