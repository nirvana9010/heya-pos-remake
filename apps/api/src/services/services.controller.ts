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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { ImportServicesDto } from './dto/import-services.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Service } from '@prisma/client';
import { PaginatedResponse } from '../types';

@Controller('services')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @RequirePermissions('service.create')
  create(
    @Body() createServiceDto: CreateServiceDto,
    @CurrentUser() user: any,
  ): Promise<Service> {
    return this.servicesService.create(user.merchantId, createServiceDto);
  }

  @Get()
  @RequirePermissions('service.view')
  findAll(
    @Query() query: QueryServiceDto,
    @CurrentUser() user: any,
  ): Promise<PaginatedResponse<Service>> {
    return this.servicesService.findAll(user.merchantId, query);
  }

  @Get(':id')
  @RequirePermissions('service.view')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<Service> {
    return this.servicesService.findOne(id, user.merchantId);
  }

  @Patch(':id')
  @RequirePermissions('service.update')
  update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @CurrentUser() user: any,
  ): Promise<Service> {
    return this.servicesService.update(id, user.merchantId, updateServiceDto);
  }

  @Delete(':id')
  @RequirePermissions('service.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.servicesService.remove(id, user.merchantId);
  }

  @Post('import')
  @RequirePermissions('service.create')
  async importServices(
    @Body() importDto: ImportServicesDto,
    @CurrentUser() user: any,
  ) {
    return this.servicesService.importServices(user.merchantId, importDto);
  }

  @Post('import/csv')
  @RequirePermissions('service.create')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Query('updateExisting') updateExisting: string,
    @Query('createCategories') createCategories: string,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be CSV format');
    }

    const services = await this.servicesService.parseCsvFile(file.buffer);

    const importDto: ImportServicesDto = {
      services,
      updateExisting: updateExisting === 'true',
      createCategories: createCategories !== 'false', // Default true
    };

    return this.servicesService.importServices(user.merchantId, importDto);
  }

  @Patch('reorder')
  @RequirePermissions('service.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateDisplayOrder(
    @Body() updates: { id: string; displayOrder: number }[],
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.servicesService.updateDisplayOrder(user.merchantId, updates);
  }

  @Patch('bulk/status')
  @RequirePermissions('service.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async bulkUpdateStatus(
    @Body() body: { serviceIds: string[]; isActive: boolean },
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.servicesService.bulkUpdateStatus(
      user.merchantId,
      body.serviceIds,
      body.isActive,
    );
  }
}