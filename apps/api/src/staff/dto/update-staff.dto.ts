import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateStaffDto } from './create-staff.dto';
import { IsOptional, IsString, IsEnum, MinLength, MaxLength } from 'class-validator';
import { StaffStatus } from '../../types';

export class UpdateStaffDto extends PartialType(
  OmitType(CreateStaffDto, ['email', 'pin'] as const)
) {
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(6)
  newPin?: string;
}