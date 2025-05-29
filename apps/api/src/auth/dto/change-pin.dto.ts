import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class ChangePinDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 6)
  @Matches(/^\d+$/, { message: 'Current PIN must contain only numbers' })
  currentPin: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 6)
  @Matches(/^\d+$/, { message: 'New PIN must contain only numbers' })
  newPin: string;
}