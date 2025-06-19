import { IsString, IsEmail, IsOptional, IsDateString, IsEnum, IsNotEmpty, Matches, IsBoolean, IsArray, MaxLength, MinLength } from 'class-validator';
import { IsValidPhone } from '../../common/validation/decorators';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER'
}

export enum CustomerSource {
  WALK_IN = 'WALK_IN',
  ONLINE = 'ONLINE',
  REFERRAL = 'REFERRAL',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  MIGRATED = 'MIGRATED',
  OTHER = 'OTHER'
}

export class CreateCustomerDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @IsString()
  @IsOptional()
  @IsValidPhone()
  phone?: string;

  @IsString()
  @IsOptional()
  @IsValidPhone()
  mobile?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  suburb?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(10)
  preferredLanguage?: string;

  @IsBoolean()
  @IsOptional()
  marketingConsent?: boolean;

  @IsEnum(CustomerSource)
  @IsOptional()
  source?: CustomerSource;
}