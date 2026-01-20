import { IsOptional, IsPhoneNumber } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}
