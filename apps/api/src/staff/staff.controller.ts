import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createStaffDto: CreateStaffDto) {
    return this.staffService.create(user.merchantId, createStaffDto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query('active') active?: string) {
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.staffService.findAll(user.merchantId, isActive);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.staffService.findOne(user.merchantId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    return this.staffService.update(user.merchantId, id, updateStaffDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.staffService.remove(user.merchantId, id);
  }
}