import { IsString, IsNotEmpty, IsDateString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingWithOverrideDto {
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @IsUUID()
  @IsNotEmpty()
  staffId: string;

  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @IsUUID()
  @IsNotEmpty()
  locationId: string;

  @Type(() => Date)
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isOverride?: boolean = false;

  @IsString()
  @IsOptional()
  overrideReason?: string;

  @IsBoolean()
  @IsOptional()
  sendConfirmation?: boolean = true;

  @IsBoolean()
  @IsOptional()
  sendReminder?: boolean = true;
}