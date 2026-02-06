import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
} from "class-validator";

export class InviteMerchantUserDto {
  @IsEmail()
  email: string;

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

export class AcceptInviteDto {
  @IsString()
  token: string;

  @IsString()
  password: string;
}
