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
    return this.customersService.importCustomers(user.merchantId, file);
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
}