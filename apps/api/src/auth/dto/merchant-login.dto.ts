import { IsString, IsNotEmpty, MinLength, IsEmail } from 'class-validator';

export class MerchantLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}