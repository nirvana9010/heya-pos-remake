import {
  IsEmail,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsArray,
  Matches,
} from "class-validator";
import { Transform } from "class-transformer";
import { StaffRole } from "../../types";

export class CreateStaffDto {
  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(4)
  pin?: string;

  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @IsNumber()
  @Min(1)
  @Max(10)
  accessLevel: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsString()
  @Matches(/^(#[0-9A-Fa-f]{6}|auto)$/, {
    message: 'calendarColor must be a valid hex color code or "auto"',
  })
  calendarColor?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locationIds?: string[];

  @IsOptional()
  @IsEnum(["ACTIVE", "INACTIVE"])
  status?: "ACTIVE" | "INACTIVE";
}
