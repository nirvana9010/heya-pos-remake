import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class VerifyPinDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 6)
  @Matches(/^\d+$/, { message: 'PIN must contain only numbers' })
  pin: string;

  @IsString()
  @IsNotEmpty()
  action: string;
}