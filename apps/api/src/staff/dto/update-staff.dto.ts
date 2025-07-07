import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateStaffDto } from './create-staff.dto';
import { IsOptional, IsString, IsEnum, MinLength, MaxLength } from 'class-validator';

export class UpdateStaffDto extends PartialType(
  OmitType(CreateStaffDto, ['email'] as const)
) {
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(4)
  pin?: string;
}