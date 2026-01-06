import { IsBoolean, IsDateString, IsOptional, IsString } from "class-validator";

export class UpdateMerchantHolidayDto {
  @IsOptional()
  @IsBoolean()
  isDayOff?: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
