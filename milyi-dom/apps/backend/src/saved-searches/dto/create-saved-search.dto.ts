import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSavedSearchDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsObject()
  filters!: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  notifyEmail?: boolean;
}
