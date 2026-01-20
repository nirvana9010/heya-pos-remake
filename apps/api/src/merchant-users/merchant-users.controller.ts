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
import { MerchantUsersService } from './merchant-users.service';
import {
  CreateMerchantUserDto,
  UpdateMerchantUserDto,
  InviteMerchantUserDto,
  AcceptInviteDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('merchant-users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MerchantUsersController {
  constructor(private readonly merchantUsersService: MerchantUsersService) {}

  @Post()
  @Permissions('staff.create')
  create(@CurrentUser() user: any, @Body() dto: CreateMerchantUserDto) {
    return this.merchantUsersService.create(user.merchantId, dto);
  }

  @Post('invite')
  @Permissions('staff.create')
  invite(@CurrentUser() user: any, @Body() dto: InviteMerchantUserDto) {
    return this.merchantUsersService.invite(user.merchantId, dto);
  }

  @Get()
  @Permissions('staff.view')
  findAll(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.merchantUsersService.findAll(user.merchantId, status);
  }

  @Get('roles')
  @Permissions('staff.view')
  findAllRoles(@CurrentUser() user: any) {
    return this.merchantUsersService.findAllRoles(user.merchantId);
  }

  @Get(':id')
  @Permissions('staff.view')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.merchantUsersService.findOne(user.merchantId, id);
  }

  @Patch(':id')
  @Permissions('staff.update')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateMerchantUserDto,
  ) {
    return this.merchantUsersService.update(user.merchantId, id, dto);
  }

  @Delete(':id')
  @Permissions('staff.delete')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.merchantUsersService.remove(user.merchantId, id);
  }

  // Role management endpoints
  @Post('roles')
  @Permissions('settings.update')
  createRole(
    @CurrentUser() user: any,
    @Body() data: { name: string; description?: string; permissions: string[] },
  ) {
    return this.merchantUsersService.createRole(user.merchantId, data);
  }

  @Patch('roles/:id')
  @Permissions('settings.update')
  updateRole(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string; permissions?: string[] },
  ) {
    return this.merchantUsersService.updateRole(user.merchantId, id, data);
  }

  @Delete('roles/:id')
  @Permissions('settings.update')
  deleteRole(@CurrentUser() user: any, @Param('id') id: string) {
    return this.merchantUsersService.deleteRole(user.merchantId, id);
  }
}

// Separate controller for public invite acceptance (no auth required)
@Controller('merchant-users/invite')
export class MerchantUsersInviteController {
  constructor(private readonly merchantUsersService: MerchantUsersService) {}

  @Post('accept')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.merchantUsersService.acceptInvite(dto.token, dto.password);
  }
}
