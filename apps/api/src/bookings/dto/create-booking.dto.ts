import { IsString, IsNotEmpty, IsDateString, IsArray, IsOptional, IsNumber, Min, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export class BookingServiceDto {
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  duration: number; // in minutes
}

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  providerId: string;  // Main staff member

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsArray()
  @Type(() => BookingServiceDto)
  @IsNotEmpty()
  services: BookingServiceDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus = BookingStatus.CONFIRMED;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsString()
  @IsOptional()
  createdById?: string;  // Staff member creating the booking

  @IsBoolean()
  @IsOptional()
  sendConfirmation?: boolean = true;

  @IsBoolean()
  @IsOptional()
  sendReminder?: boolean = true;
}