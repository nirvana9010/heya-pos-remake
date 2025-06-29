import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantNotificationsService } from './merchant-notifications.service';
import { Request } from 'express';

@Controller('merchant/notifications')
@UseGuards(JwtAuthGuard)
export class MerchantNotificationsController {
  constructor(
    private readonly notificationsService: MerchantNotificationsService,
  ) {}

  @Get()
  async getNotifications(
    @Req() req: Request,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const merchantId = (req.user as any).merchantId;
    
    return this.notificationsService.getNotifications(merchantId, {
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Patch(':id/read')
  async markAsRead(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const merchantId = (req.user as any).merchantId;
    return this.notificationsService.markAsRead(merchantId, id);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: Request) {
    const merchantId = (req.user as any).merchantId;
    return this.notificationsService.markAllAsRead(merchantId);
  }

  @Delete(':id')
  async deleteNotification(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const merchantId = (req.user as any).merchantId;
    return this.notificationsService.deleteNotification(merchantId, id);
  }

  @Delete()
  async deleteAllNotifications(@Req() req: Request) {
    const merchantId = (req.user as any).merchantId;
    return this.notificationsService.deleteAllNotifications(merchantId);
  }
}