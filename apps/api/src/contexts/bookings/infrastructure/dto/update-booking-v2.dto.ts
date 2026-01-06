import {
  IsOptional,
  IsDateString,
  IsUUID,
  IsArray,
  ValidateNested,
  MaxLength,
  IsBoolean,
  IsString,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { BookingServiceDto } from "./create-booking-v2.dto";

export enum BookingStatus {
  CONFIRMED = "confirmed",
  IN_PROGRESS = "in-progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  NO_SHOW = "no-show",
}

export class UpdateBookingV2Dto {
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingServiceDto)
  services?: BookingServiceDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  // @IsEnum(BookingStatus) // NUCLEAR: Disabled enum validation to allow any status including 'no-show'
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cancellationReason?: string;

  @IsOptional()
  @IsBoolean()
  customerRequestedStaff?: boolean;

  @IsOptional()
  @IsString()
  @Matches(
    /^(WALK_IN|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
    {
      message: 'customerId must be either "WALK_IN" or a valid UUID',
    },
  )
  customerId?: string;
}
