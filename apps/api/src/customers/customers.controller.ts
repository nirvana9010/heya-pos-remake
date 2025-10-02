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
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { SearchCustomersDto } from './dto/search-customers.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PinAuthGuard } from '../auth/guards/pin-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CustomerDuplicateAction,
  CustomerExecuteImportDto,
  CustomerImportOptionsDto,
} from './dto/import-customers.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @UseGuards(PinAuthGuard)
  @Permissions('customers.create')
  create(@CurrentUser() user: any, @Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(user.merchantId, createCustomerDto);
  }

  @Get()
  @Permissions('customers.read')
  findAll(@CurrentUser() user: any, @Query() params: SearchCustomersDto) {
    return this.customersService.findAll(user.merchantId, params);
  }

  @Get('search')
  @Permissions('customers.read')
  async searchCustomers(@CurrentUser() user: any, @Query('q') query: string) {
    // Dedicated search endpoint that returns all matching results without pagination
    if (!query || query.length < 2) {
      return { data: [], total: 0 };
    }
    
    return this.customersService.searchCustomers(user.merchantId, query);
  }

  @Get('export')
  @Permissions('customers.export')
  async export(
    @CurrentUser() user: any,
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Res() res: Response,
  ) {
    const data = await this.customersService.exportCustomers(user.merchantId, format);

    if (format === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="customers.csv"');
      res.send(data);
    } else {
      res.json(data);
    }
  }

  @Get('stats')
  @Permissions('customers.read')
  getStats(@CurrentUser() user: any) {
    return this.customersService.getStats(user.merchantId);
  }

  @Post('import')
  @UseGuards(PinAuthGuard)
  @Permissions('customers.import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.validateImportFile(file);
    return this.customersService.importCustomers(user.merchantId, file);
  }

  @Post('import/mapping')
  @UseGuards(PinAuthGuard)
  @Permissions('customers.import')
  @UseInterceptors(FileInterceptor('file'))
  async getImportMapping(@UploadedFile() file: Express.Multer.File) {
    this.validateImportFile(file);
    return this.customersService.getCustomerImportMapping(file);
  }

  @Post('import/preview')
  @UseGuards(PinAuthGuard)
  @Permissions('customers.import')
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    this.validateImportFile(file);

    const options: CustomerImportOptionsDto = {
      duplicateAction:
        body?.duplicateAction === CustomerDuplicateAction.SKIP
          ? CustomerDuplicateAction.SKIP
          : CustomerDuplicateAction.UPDATE,
      skipInvalidRows:
        body?.skipInvalidRows === 'false' || body?.skipInvalidRows === false
          ? false
          : true,
    };

    let columnMappings: Record<string, string> | undefined;
    if (body?.columnMappings) {
      try {
        columnMappings =
          typeof body.columnMappings === 'string'
            ? JSON.parse(body.columnMappings)
            : body.columnMappings;
      } catch (error) {
        throw new BadRequestException('Invalid column mappings format');
      }
    }

    return this.customersService.previewCustomerImport(
      user.merchantId,
      file.buffer,
      options,
      columnMappings,
    );
  }

  @Post('import/execute')
  @UseGuards(PinAuthGuard)
  @Permissions('customers.import')
  async executeImport(
    @CurrentUser() user: any,
    @Body() body: CustomerExecuteImportDto,
  ) {
    if (!body?.rows || !Array.isArray(body.rows)) {
      throw new BadRequestException('Rows payload is required');
    }

    const options = body.options ?? {
      duplicateAction: CustomerDuplicateAction.UPDATE,
      skipInvalidRows: true,
    };

    return this.customersService.executeCustomerImport(
      user.merchantId,
      body.rows,
      options,
    );
  }

  @Get(':id')
  @Permissions('customers.read')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customersService.findOne(user.merchantId, id);
  }

  @Patch(':id')
  @UseGuards(PinAuthGuard)
  @Permissions('customers.update')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(user.merchantId, id, updateCustomerDto);
  }

  @Delete(':id')
  @UseGuards(PinAuthGuard)
  @Permissions('customers.delete')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customersService.remove(user.merchantId, id);
  }

  private validateImportFile(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (
      !file.mimetype?.includes('csv') &&
      !file.originalname?.toLowerCase().endsWith('.csv')
    ) {
      throw new BadRequestException('File must be CSV format');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 5MB');
    }
  }
}
