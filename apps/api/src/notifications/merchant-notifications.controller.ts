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
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MerchantNotificationsService } from "./merchant-notifications.service";
import { SupabaseService } from "../supabase/supabase.service";
import { Request } from "express";

@Controller("merchant/notifications")
@UseGuards(JwtAuthGuard)
export class MerchantNotificationsController {
  constructor(
    private readonly notificationsService: MerchantNotificationsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  async getNotifications(
    @Req() req: Request,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
    @Query("unreadOnly") unreadOnly?: string,
    @Query("since") since?: string,
  ) {
    const merchantId = (req.user as any).merchantId;

    const result = await this.notificationsService.getNotifications(
      merchantId,
      {
        skip: skip ? parseInt(skip) : undefined,
        take: take ? parseInt(take) : undefined,
        unreadOnly: unreadOnly === "true",
        since: since ? new Date(since) : undefined,
      },
    );

    return result;
  }

  @Patch(":id/read")
  async markAsRead(@Req() req: Request, @Param("id") id: string) {
    const merchantId = (req.user as any).merchantId;
    return this.notificationsService.markAsRead(merchantId, id);
  }

  @Patch("read-all")
  async markAllAsRead(@Req() req: Request) {
    const merchantId = (req.user as any).merchantId;
    return this.notificationsService.markAllAsRead(merchantId);
  }

  @Delete(":id")
  async deleteNotification(@Req() req: Request, @Param("id") id: string) {
    const merchantId = (req.user as any).merchantId;
    return this.notificationsService.deleteNotification(merchantId, id);
  }

  @Delete()
  async deleteAllNotifications(@Req() req: Request) {
    const merchantId = (req.user as any).merchantId;
    return this.notificationsService.deleteAllNotifications(merchantId);
  }

  // Test endpoint for development only - creates notification exactly like real bookings
  @Post("test")
  async createTestNotification(@Req() req: Request) {
    if (process.env.NODE_ENV === "production") {
      throw new HttpException(
        "Not available in production",
        HttpStatus.FORBIDDEN,
      );
    }

    const merchantId = (req.user as any).merchantId;

    // Create a test notification using the EXACT same method as real bookings
    const testBookingId = `test-booking-${Date.now()}`;
    const testStartTime = new Date();
    testStartTime.setHours(testStartTime.getHours() + 2); // 2 hours from now

    const notification =
      await this.notificationsService.createBookingNotification(
        merchantId,
        "booking_new",
        {
          id: testBookingId,
          customerName: "Test Customer",
          serviceName: "Test Service",
          startTime: testStartTime,
          staffName: "Test Staff",
        },
      );

    return {
      success: true,
      notification,
      message:
        "Notification created. Will be picked up by polling within 10 seconds.",
    };
  }

  @Post("realtime-token")
  async getRealtimeToken(@Req() req: Request) {
    const merchantId = (req.user as any).merchantId;
    const userId = (req.user as any).sub;

    // Check if Supabase is configured
    if (!this.supabaseService.isConfigured()) {
      throw new HttpException(
        "Realtime service not configured",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Generate custom token for Supabase Realtime
    const token = await this.supabaseService.generateRealtimeToken(
      merchantId,
      userId,
    );

    if (!token) {
      throw new HttpException(
        "Failed to generate realtime token",
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
