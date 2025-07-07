import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsDateString,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BookingServiceDto {
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;
}

export class CreateBookingV2Dto {
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsUUID()
  @IsNotEmpty()
  locationId: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BookingServiceDto)
  services: BookingServiceDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsBoolean()
  isOverride?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  overrideReason?: string;
}