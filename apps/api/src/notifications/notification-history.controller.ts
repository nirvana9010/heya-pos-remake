import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './interfaces/notification.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications/history')
@UseGuards(JwtAuthGuard)
export class NotificationHistoryController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async listHistory(
    @CurrentUser() user: any,
    @Query('type') type?: NotificationType,
    @Query('channel') channel?: 'email' | 'sms',
    @Query('status') status?: 'sent' | 'failed',
    @Query('customerId') customerId?: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? Math.min(Math.max(parseInt(limit, 10), 1), 200) : 100;

    const logs = await this.notificationsService.getNotificationHistory(
      {
        merchantId: user.merchantId,
        customerId,
        type,
        channel,
        status,
      },
      take,
    );

    return logs;
  }
}
