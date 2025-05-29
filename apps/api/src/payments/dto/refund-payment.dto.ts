import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class RefundPaymentDto {
  @IsString()
  paymentId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  staffPin?: string;
}