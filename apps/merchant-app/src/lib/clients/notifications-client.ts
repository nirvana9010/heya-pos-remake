import { BaseApiClient } from './base-client';

export interface MerchantNotification {
  id: string;
  type: 'booking_new' | 'booking_cancelled' | 'booking_modified' | 'payment_refunded';
  priority: 'urgent' | 'important' | 'info';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: {
    bookingId?: string;
    customerId?: string;
    staffId?: string;
    amount?: number;
    customerName?: string;
    serviceName?: string;
    time?: string;
    date?: string;
    changes?: string;
    paymentId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  data: MerchantNotification[];
  total: number;
  unreadCount: number;
}

export class NotificationsClient extends BaseApiClient {
  async getNotifications(params?: {
    skip?: number;
    take?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationsResponse> {
    console.log('[NotificationsClient] Fetching notifications with params:', params);
    const result = await this.get('/merchant/notifications', { params });
    console.log('[NotificationsClient] API Response:', {
      dataCount: result.data?.length || 0,
      unreadCount: result.unreadCount,
      total: result.total
    });
    return result;
  }

  async markAsRead(notificationId: string): Promise<MerchantNotification> {
    return this.patch(`/merchant/notifications/${notificationId}/read`);
  }

  async markAllAsRead(): Promise<{ count: number }> {
    return this.patch('/merchant/notifications/read-all');
  }

  async deleteNotification(notificationId: string): Promise<{ success: boolean }> {
    return this.delete(`/merchant/notifications/${notificationId}`);
  }

  async deleteAllNotifications(): Promise<{ count: number }> {
    return this.delete('/merchant/notifications');
  }
}