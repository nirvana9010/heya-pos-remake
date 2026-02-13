import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsOptional,
} from "class-validator";

export class VerifyPinDto {
  @IsString()
  @IsOptional()
  staffId?: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  @Matches(/^\d+$/, { message: "PIN must contain only numbers" })
  pin: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsOptional()
  resourceId?: string;
}
