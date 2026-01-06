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
  Matches,
} from "class-validator";
import { Type } from "class-transformer";

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
  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(WALK_IN|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
    {
      message: 'customerId must be either "WALK_IN" or a valid UUID',
    },
  )
  customerId: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

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

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsBoolean()
  customerRequestedStaff?: boolean;
}
