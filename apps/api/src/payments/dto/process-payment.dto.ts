import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { PaymentMethod } from '../../types/payment.types';

export class ProcessPaymentDto {
  @IsString()
  invoiceId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // For card payments
  @IsOptional()
  @IsString()
  stripePaymentMethodId?: string;

  @IsOptional()
  @IsString()
  tyroTerminalId?: string;

  // For Tyro payments
  @IsOptional()
  @IsString()
  tyroTransactionReference?: string;

  @IsOptional()
  @IsString()
  tyroAuthorisationCode?: string;

  @IsOptional()
  @IsNumber()
  tyroDasurchargeAmount?: number;

  @IsOptional()
  @IsNumber()
  tyroBaseAmount?: number;

  // For cash payments
  @IsOptional()
  @IsNumber()
  cashReceived?: number;
}