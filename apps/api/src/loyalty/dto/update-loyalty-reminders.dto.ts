import { Type } from 'class-transformer';
import {
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

class LoyaltyReminderTouchpointDto {
  @IsInt()
  @Min(1)
  @Max(3)
  sequence!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  thresholdValue!: number;

  @IsOptional()
  @MaxLength(200)
  emailSubject?: string;

  @IsOptional()
  emailBody?: string;

  @IsOptional()
  smsBody?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateLoyaltyRemindersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoyaltyReminderTouchpointDto)
  touchpoints!: LoyaltyReminderTouchpointDto[];
}

export { LoyaltyReminderTouchpointDto };
