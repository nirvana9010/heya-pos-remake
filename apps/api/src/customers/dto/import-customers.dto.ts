import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export enum CustomerDuplicateAction {
  SKIP = "skip",
  UPDATE = "update",
}

export class CustomerImportOptionsDto {
  @IsEnum(CustomerDuplicateAction)
  duplicateAction: CustomerDuplicateAction = CustomerDuplicateAction.UPDATE;

  @IsBoolean()
  skipInvalidRows: boolean = true;
}

export interface CustomerImportValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CustomerImportData {
  email?: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  mobile?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  marketingConsent?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  notificationPreference?: string;
  source?: string;
  tags?: string[];
  preferredLanguage?: string;
  status?: string;
  createdAtOverride?: Date;
}

export interface CustomerImportPreviewRow {
  rowNumber: number;
  original: Record<string, any>;
  data?: CustomerImportData;
  validation: CustomerImportValidation;
  action: "create" | "update" | "skip";
  existingCustomerId?: string;
}

export interface CustomerImportSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  toCreate: number;
  toUpdate: number;
  toSkip: number;
}

export class CustomerImportPreviewDto {
  rows!: CustomerImportPreviewRow[];
  summary!: CustomerImportSummary;
}

export class CustomerExecuteImportDto {
  @IsArray()
  rows!: CustomerImportPreviewRow[];

  @ValidateNested()
  @Type(() => CustomerImportOptionsDto)
  @IsOptional()
  options?: CustomerImportOptionsDto;
}

export interface CustomerImportResultDto {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}
