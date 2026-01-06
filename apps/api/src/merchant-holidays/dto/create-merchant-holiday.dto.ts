import { IsDateString, IsNotEmpty, IsString } from "class-validator";

export class CreateMerchantHolidayDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  date!: string;
}
