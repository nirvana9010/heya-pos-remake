import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  MinLength,
  IsUUID,
  IsIn,
} from 'class-validator';

export class UpdateMerchantUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsUUID()
  @IsOptional()
  roleId?: string;

  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  @IsOptional()
  status?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  locationIds?: string[];
}
