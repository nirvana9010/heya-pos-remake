import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  Matches,
  IsBoolean,
  IsArray,
  MaxLength,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { IsValidPhone } from "../../common/validation/decorators";

const normalizeOptionalString = ({ value }: { value: unknown }) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum CustomerSource {
  WALK_IN = "WALK_IN",
  ONLINE = "ONLINE",
  REFERRAL = "REFERRAL",
  SOCIAL_MEDIA = "SOCIAL_MEDIA",
  MIGRATED = "MIGRATED",
  OTHER = "OTHER",
}

export class CreateCustomerDto {
  @Transform(normalizeOptionalString)
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @Transform(normalizeOptionalString)
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @Transform(normalizeOptionalString)
  @IsString()
  @IsOptional()
  @IsValidPhone()
  phone?: string;

  @Transform(normalizeOptionalString)
  @IsString()
  @IsOptional()
  @IsValidPhone()
  mobile?: string;

  @Transform(normalizeOptionalString)
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @Transform(normalizeOptionalString)
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @Transform(normalizeOptionalString)
  @IsString()
  @IsOptional()
  address?: string;

  @Transform(normalizeOptionalString)
  @IsString()
  @IsOptional()
  suburb?: string;

  @Transform(normalizeOptionalString)
  @IsString()
  @IsOptional()
  city?: string;

  @Transform(normalizeOptionalString)
  @IsString()
  @IsOptional()
  state?: string;

  @Transform(normalizeOptionalString)
  @IsString()
  @IsOptional()
  country?: string;

  @Transform(normalizeOptionalString)
  @IsString()
  @IsOptional()
  postalCode?: string;

  @Transform(normalizeOptionalString)
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @Transform(normalizeOptionalString)
  @IsString()
  @IsOptional()
  @MaxLength(10)
  preferredLanguage?: string;

  @IsBoolean()
  @IsOptional()
  marketingConsent?: boolean;

  @Transform(normalizeOptionalString)
  @IsEnum(CustomerSource)
  @IsOptional()
  source?: CustomerSource;

  // @IsString()
  // @IsOptional()
  // @MaxLength(500)
  // allergies?: string;

  // @IsString()
  // @IsOptional()
  // @MaxLength(500)
  // specialRequirements?: string;

  // @IsString()
  // @IsOptional()
  // @MaxLength(50)
  // referralSource?: string;
}
