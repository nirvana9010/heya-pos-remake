import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  category?: string; // For import purposes

  @IsNumber()
  @Min(0)
  duration: number; // in minutes

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  taxRate?: number; // Default 0.1 (10% GST)

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresDeposit?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  depositAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxAdvanceBooking?: number; // days

  @IsNumber()
  @IsOptional()
  @Min(0)
  minAdvanceBooking?: number; // hours

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}