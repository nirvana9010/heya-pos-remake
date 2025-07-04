import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsArray, ValidateNested, IsNotEmpty, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum DuplicateAction {
  SKIP = 'skip',
  UPDATE = 'update',
  CREATE_NEW = 'create_new'
}

export enum ImportAction {
  ADD = 'add',
  EDIT = 'edit',
  DELETE = 'delete'
}

export class ServiceCsvRowDto {
  @IsString()
  @IsOptional()
  id?: string; // Optional unique identifier for the service (e.g., "SERVICE001", "SVC-123")

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  duration?: string | number; // Flexible to accept "60", "1h", "1.5h" - optional if price-to-duration is set

  @IsNumber()
  @Min(0)
  price: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsEnum(ImportAction)
  @IsOptional()
  action?: ImportAction; // Explicit action: add/edit/delete

  // Legacy fields - kept for backwards compatibility but not used in new imports
  @IsBoolean()
  @IsOptional()
  deposit_required?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  deposit_amount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  tax_rate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  min_advance_hours?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  max_advance_days?: number;
}

export class ImportOptionsDto {
  @IsEnum(DuplicateAction)
  duplicateAction: DuplicateAction = DuplicateAction.SKIP;

  @IsBoolean()
  createCategories: boolean = true;

  @IsBoolean()
  skipInvalidRows: boolean = false;
}

export interface ImportValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportPreviewRow {
  rowNumber: number;
  data: ServiceCsvRowDto;
  validation: ImportValidation;
  action: 'create' | 'update' | 'skip' | 'delete';
  existingServiceId?: string;
}

export interface ImportSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  toCreate: number;
  toUpdate: number;
  toSkip: number;
  toDelete: number;
}

export class ImportPreviewDto {
  rows: ImportPreviewRow[];
  summary: ImportSummary;
}

export class ExecuteImportDto {
  @IsArray()
  rows: ImportPreviewRow[];

  @ValidateNested()
  @Type(() => ImportOptionsDto)
  options: ImportOptionsDto;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  deleted: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

// Legacy types for existing code
export interface ServiceImportItem {
  'Service Name': string;
  'Category'?: string;
  'Duration (min)': string | number;
  'Price': string | number;
  [key: string]: any;
}

export class ImportServicesDto {
  @IsArray()
  services: ServiceImportItem[];

  @IsBoolean()
  updateExisting: boolean = false;

  @IsBoolean()
  createCategories: boolean = true;
}