import { IsEmail, IsString, IsNumber, IsOptional, IsEnum, MinLength, MaxLength, Min, Max, IsArray, Matches } from 'class-validator';
import { StaffRole } from '../../types';

export class CreateStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(4)
  pin?: string;

  @IsEnum(StaffRole)
  role: StaffRole;

  @IsNumber()
  @Min(1)
  @Max(10)
  accessLevel: number;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @IsOptional()
  @IsString()
  @Matches(/^(#[0-9A-Fa-f]{6}|auto)$/, {
    message: 'calendarColor must be a valid hex color code or "auto"'
  })
  calendarColor?: string;

  @IsArray()
  @IsString({ each: true })
  locationIds: string[];
}