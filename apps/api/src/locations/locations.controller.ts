import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

interface UpdateLocationDto {
  name?: string;
  timezone?: string;
  address?: string;
  phone?: string;
  email?: string;
  businessHours?: any;
}

@Controller('locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @Permissions('location.view')
  findAll(@CurrentUser() user: any) {
    return this.locationsService.findAll(user.merchantId);
  }

  @Get(':id')
  @Permissions('location.view')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.locationsService.findOne(user.merchantId, id);
  }

  @Patch(':id')
  @Permissions('location.update')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.locationsService.update(user.merchantId, id, updateLocationDto);
  }

  @Patch(':id/timezone')
  @Permissions('location.update')
  updateTimezone(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('timezone') timezone: string,
  ) {
    return this.locationsService.updateTimezone(user.merchantId, id, timezone);
  }
}