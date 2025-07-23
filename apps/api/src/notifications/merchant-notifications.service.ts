import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface CreateNotificationDto {
  type: 'booking_new' | 'booking_cancelled' | 'booking_modified' | 'payment_refunded';
  priority?: 'urgent' | 'important' | 'info';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class MerchantNotificationsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createNotification(merchantId: string, data: CreateNotificationDto) {
    const notification = await this.prisma.merchantNotification.create({
      data: {
        merchantId,
        type: data.type,
        priority: data.priority || 'info',
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        metadata: data.metadata || {},
      },
    });

    // Emit event for potential real-time updates (not currently used)
    this.eventEmitter.emit('notification.created', {
      merchantId,
      notification,
    });

    return notification;
  }

  async getNotifications(merchantId: string, params?: {
    skip?: number;
    take?: number;
    unreadOnly?: boolean;
    since?: Date | string;
  }) {
    const where: Prisma.MerchantNotificationWhereInput = {
      merchantId,
    };

    if (params?.unreadOnly) {
      where.read = false;
    }

    // Only fetch notifications created after the specified timestamp
    if (params?.since) {
      where.createdAt = {
        gt: new Date(params.since),
      };
    }

    const [notifications, total] = await Promise.all([
      this.prisma.merchantNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params?.skip || 0,
        take: params?.take || 50,
      }),
      this.prisma.merchantNotification.count({ where }),
    ]);
    

    return {
      data: notifications,
      total,
      unreadCount: params?.unreadOnly ? total : await this.getUnreadCount(merchantId),
    };
  }

  async getUnreadCount(merchantId: string) {
    return this.prisma.merchantNotification.count({
      where: {
        merchantId,
        read: false,
      },
    });
  }

  async markAsRead(merchantId: string, notificationId: string) {
    const notification = await this.prisma.merchantNotification.findFirst({
      where: {
        id: notificationId,
        merchantId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.merchantNotification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllAsRead(merchantId: string) {
    const result = await this.prisma.merchantNotification.updateMany({
      where: {
        merchantId,
        read: false,
      },
      data: { read: true },
    });

    return { count: result.count };
  }

  async deleteNotification(merchantId: string, notificationId: string) {
    const notification = await this.prisma.merchantNotification.findFirst({
      where: {
        id: notificationId,
        merchantId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.merchantNotification.delete({
      where: { id: notificationId },
    });

    return { success: true };
  }

  async deleteAllNotifications(merchantId: string) {
    const result = await this.prisma.merchantNotification.deleteMany({
      where: { merchantId },
    });

    return { count: result.count };
  }

  // Helper method to create booking notifications
  async createBookingNotification(
    merchantId: string,
    type: 'booking_new' | 'booking_cancelled' | 'booking_modified',
    booking: {
      id: string;
      customerName: string;
      serviceName: string;
      startTime: Date | string;
      staffName?: string;
    },
    changes?: string,
  ) {
    const time = new Date(booking.startTime).toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const date = new Date(booking.startTime).toLocaleDateString('en-AU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    let notification: CreateNotificationDto;

    switch (type) {
      case 'booking_new':
        notification = {
          type: 'booking_new',
          priority: 'important',
          title: 'New booking received',
          message: `${booking.customerName} booked ${booking.serviceName} for ${date} at ${time}`,
          actionUrl: `/bookings/${booking.id}`,
          actionLabel: 'View booking',
          metadata: {
            bookingId: booking.id,
            customerName: booking.customerName,
            serviceName: booking.serviceName,
            time,
            date,
          },
        };
        break;

      case 'booking_modified':
        notification = {
          type: 'booking_modified',
          priority: 'info',
          title: 'Booking rescheduled',
          message: `Booking for ${booking.customerName} ${changes || 'modified their booking'}`,
          actionUrl: `/bookings/${booking.id}`,
          actionLabel: 'View booking',
          metadata: {
            bookingId: booking.id,
            customerName: booking.customerName,
            changes,
          },
        };
        break;

      case 'booking_cancelled':
        notification = {
          type: 'booking_cancelled',
          priority: 'urgent',
          title: 'Booking cancelled',
          message: `${booking.customerName} cancelled ${booking.serviceName} at ${time}`,
          actionUrl: '/calendar',
          actionLabel: 'Fill slot',
          metadata: {
            bookingId: booking.id,
            customerName: booking.customerName,
            serviceName: booking.serviceName,
            time,
            date,
          },
        };
        break;
    }

    return this.createNotification(merchantId, notification);
  }

  // Helper method to create payment refund notifications
  async createRefundNotification(
    merchantId: string,
    refund: {
      paymentId: string;
      customerName: string;
      amount: number;
    },
  ) {
    return this.createNotification(merchantId, {
      type: 'payment_refunded',
      priority: 'important',
      title: 'Refund processed',
      message: `$${refund.amount.toFixed(2)} refunded to ${refund.customerName}`,
      actionUrl: '/payments',
      actionLabel: 'View details',
      metadata: {
        paymentId: refund.paymentId,
        customerName: refund.customerName,
        amount: refund.amount,
      },
    });
  }
}