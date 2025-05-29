import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceCategoryDto } from './dto/create-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ServiceCategory } from '@prisma/client';

@Controller('service-categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServiceCategoriesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @RequirePermissions('service.create')
  create(
    @Body() createCategoryDto: CreateServiceCategoryDto,
    @CurrentUser() user: any,
  ): Promise<ServiceCategory> {
    return this.servicesService.createCategory(user.merchantId, createCategoryDto);
  }

  @Get()
  @RequirePermissions('service.view')
  findAll(@CurrentUser() user: any): Promise<ServiceCategory[]> {
    return this.servicesService.findAllCategories(user.merchantId);
  }

  @Patch(':id')
  @RequirePermissions('service.update')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateServiceCategoryDto,
    @CurrentUser() user: any,
  ): Promise<ServiceCategory> {
    return this.servicesService.updateCategory(
      id,
      user.merchantId,
      updateCategoryDto,
    );
  }

  @Delete(':id')
  @RequirePermissions('service.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.servicesService.removeCategory(id, user.merchantId);
  }
}