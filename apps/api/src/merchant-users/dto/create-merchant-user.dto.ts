import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  MinLength,
  IsUUID,
} from "class-validator";

export class CreateMerchantUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsUUID()
  roleId: string;

  @IsArray()
  @IsUUID("4", { each: true })
  @IsOptional()
  locationIds?: string[];
}
