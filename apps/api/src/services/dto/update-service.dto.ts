import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceDto } from './create-service.dto';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @IsIn(['merchant_default', 'custom'])
  advanceBookingMode?: 'merchant_default' | 'custom';
}
