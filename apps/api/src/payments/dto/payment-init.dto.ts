import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class PaymentInitDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsOptional()
  bookingId?: string;
}

export class PaymentInitResponseDto {
  order: any; // Full order with items and payments
  paymentGateway: {
    provider: string;
    config: any;
  };
  customer?: any;
  booking?: any;
  merchant: {
    id: string;
    name: string;
    settings: any;
  };
  location: {
    id: string;
    name: string;
    settings: any;
  };
}