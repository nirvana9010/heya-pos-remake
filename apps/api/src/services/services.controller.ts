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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ServicesService } from './services.service';
import { CsvParserService } from './csv-parser.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { ImportOptionsDto, ExecuteImportDto } from './dto/import-services.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Service } from '@prisma/client';
import { PaginatedResponse } from '../types';

@Controller('services')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly csvParser: CsvParserService,
  ) {}

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

  // ============= NEW CSV IMPORT ENDPOINTS =============

  @Post('import/mapping')
  @RequirePermissions('service.create')
  @UseInterceptors(FileInterceptor('file'))
  async getCsvMapping(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be CSV format');
    }

    // File size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    return this.csvParser.parseCsvForMapping(file.buffer);
  }

  @Post('import/preview')
  @RequirePermissions('service.create')
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be CSV format');
    }

    // File size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    // Parse options from body
    const options: ImportOptionsDto = {
      duplicateAction: body.duplicateAction || 'skip',
      createCategories: body.createCategories === 'true' || body.createCategories === true,
      skipInvalidRows: body.skipInvalidRows === 'true' || body.skipInvalidRows === true,
    };

    // Parse column mappings if provided
    let columnMappings: Record<string, string> | undefined;
    if (body.columnMappings) {
      try {
        columnMappings = typeof body.columnMappings === 'string' 
          ? JSON.parse(body.columnMappings) 
          : body.columnMappings;
      } catch (e) {
        throw new BadRequestException('Invalid column mappings format');
      }
    }

    return this.servicesService.previewImport(
      user.merchantId,
      file.buffer,
      options,
      columnMappings
    );
  }

  @Post('import/execute')
  @RequirePermissions('service.create')
  async executeImport(
    @Body() body: ExecuteImportDto,
    @CurrentUser() user: any,
  ) {
    return this.servicesService.executeImport(
      user.merchantId,
      body.rows,
      body.options
    );
  }

  @Get('import/template')
  async downloadTemplate(@Res() response: Response) {
    const csv = this.csvParser.generateTemplate();
    
    response.header('Content-Type', 'text/csv');
    response.header('Content-Disposition', 'attachment; filename="service-import-template.csv"');
    response.send(csv);
  }
}