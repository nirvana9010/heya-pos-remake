import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsEnum,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";

export enum CustomerSortBy {
  NAME = "name",
  EMAIL = "email",
  CREATED_AT = "createdAt",
  TOTAL_SPENT = "totalSpent",
}

export class SearchCustomersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minTotalSpent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxTotalSpent?: number;

  @IsOptional()
  @IsEnum(CustomerSortBy)
  sortBy?: CustomerSortBy = CustomerSortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
