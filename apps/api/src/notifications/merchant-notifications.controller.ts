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
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantNotificationsService } from './merchant-notifications.service';
import { SupabaseService } from '../supabase/supabase.service';
import { Request } from 'express';

@Controller('merchant/notifications')
@UseGuards(JwtAuthGuard)
export class MerchantNotificationsController {
  constructor(
    private readonly notificationsService: MerchantNotificationsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  async getNotifications(
    @Req() req: Request,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const merchantId = (req.user as any).merchantId;
    
    console.log('[MerchantNotificationsController] Getting notifications for merchant:', merchantId);
    console.log('[MerchantNotificationsController] Query params:', { skip, take, unreadOnly });
    
    const result = await this.notificationsService.getNotifications(merchantId, {
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      unreadOnly: unreadOnly === 'true',
    });
    
    console.log('[MerchantNotificationsController] Returning notifications:', {
      total: result.total,
      dataCount: result.data.length,
      unreadCount: result.unreadCount
    });
    
    return result;
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

  // Test endpoint for development only
  @Post('test')
  async createTestNotification(@Req() req: Request) {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException('Not available in production', HttpStatus.FORBIDDEN);
    }
    
    const merchantId = (req.user as any).merchantId;
    const notification = await this.notificationsService.createNotification(merchantId, {
      type: 'booking_new',
      priority: 'important',
      title: 'Test SSE Notification',
      message: 'This is a test to verify SSE is working',
      actionUrl: '/bookings/test',
      actionLabel: 'View test',
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      notification,
      message: 'Check your SSE stream for the real-time update',
    };
  }

  @Post('realtime-token')
  async getRealtimeToken(@Req() req: Request) {
    const merchantId = (req.user as any).merchantId;
    const userId = (req.user as any).sub;

    // Check if Supabase is configured
    if (!this.supabaseService.isConfigured()) {
      throw new HttpException(
        'Realtime service not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Generate custom token for Supabase Realtime
    const token = await this.supabaseService.generateRealtimeToken(merchantId, userId);
    
    if (!token) {
      throw new HttpException(
        'Failed to generate realtime token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      token,
      url: this.supabaseService.getSupabaseUrl(),
      anonKey: this.supabaseService.getSupabaseAnonKey(),
    };
  }
}