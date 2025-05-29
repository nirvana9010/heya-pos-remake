import { IsString, IsDateString, IsArray, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckAvailabilityDto {
  @IsDateString()
  date: string;

  @IsArray()
  @IsString({ each: true })
  serviceIds: string[];

  @IsString()
  @IsOptional()
  staffId?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  duration?: number; // Total duration in minutes

  @IsString()
  @IsOptional()
  excludeBookingId?: string; // For rescheduling
}