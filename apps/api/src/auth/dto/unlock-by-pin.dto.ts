import { IsString, IsNotEmpty, Length, Matches } from "class-validator";

export class UnlockByPinDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  @Matches(/^\d+$/, { message: "PIN must contain only numbers" })
  pin: string;
}
