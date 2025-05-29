import { IsArray, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ServiceImportItem {
  'Service Name': string;
  'Price': string | number;
  'Duration (min)': string | number;
  'Category': string;
}

export class ImportServicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceImportItem)
  services: ServiceImportItem[];

  @IsBoolean()
  @IsOptional()
  updateExisting?: boolean = false;

  @IsBoolean()
  @IsOptional()
  createCategories?: boolean = true;
}