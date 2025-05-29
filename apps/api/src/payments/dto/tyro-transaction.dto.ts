import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export enum TyroTransactionResult {
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  REVERSED = 'REVERSED',
  CANCELLED = 'CANCELLED',
  SYSTEM_ERROR = 'SYSTEM ERROR',
}

export class TyroTransactionDto {
  @IsNumber()
  amount: number;

  @IsString()
  transactionReference: string;

  @IsString()
  authorisationCode: string;

  @IsNumber()
  surchargeAmount: number;

  @IsNumber()
  baseAmount: number;

  @IsEnum(TyroTransactionResult)
  result: TyroTransactionResult;

  @IsOptional()
  @IsString()
  merchantId?: string;

  @IsOptional()
  @IsString()
  terminalId?: string;
}