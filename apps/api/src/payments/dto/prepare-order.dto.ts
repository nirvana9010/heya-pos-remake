import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsEnum, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderModifierType } from '@heya-pos/types';

class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  itemType: string;

  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @IsString()
  @IsOptional()
  staffId?: string;

  @IsOptional()
  metadata?: any;
}

class OrderModifierDto {
  @IsEnum(OrderModifierType)
  type: OrderModifierType;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class PrepareOrderDto {
  // For existing orders
  @IsString()
  @IsOptional()
  orderId?: string;

  // For new orders
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsBoolean()
  @IsOptional()
  isWalkIn?: boolean;

  @IsString()
  @IsOptional()
  bookingId?: string;

  // Items to add
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsOptional()
  items?: OrderItemDto[];

  // Order-level modifier
  @ValidateNested()
  @Type(() => OrderModifierDto)
  @IsOptional()
  orderModifier?: OrderModifierDto;
}