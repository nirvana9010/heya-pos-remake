export type NotificationType = 
  | 'booking_new'
  | 'booking_cancelled'
  | 'booking_modified'
  | 'payment_refunded';

export type NotificationPriority = 'urgent' | 'important' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
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
  };
}

// Notification type configurations - simplified to essential notifications only
export const notificationConfig: Record<NotificationType, {
  icon: string;
  color: string;
  priority: NotificationPriority;
}> = {
  booking_new: { icon: 'Calendar', color: 'text-blue-600', priority: 'important' },
  booking_cancelled: { icon: 'XCircle', color: 'text-red-600', priority: 'urgent' },
  booking_modified: { icon: 'Edit', color: 'text-orange-600', priority: 'info' },
  payment_refunded: { icon: 'RefreshCw', color: 'text-orange-600', priority: 'important' },
};

// Mock notification generator for development - simplified to essential notifications
export function generateMockNotifications(): Notification[] {
  const now = new Date();
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'booking_new',
      priority: 'important',
      title: 'New booking received',
      message: 'Emma Thompson booked a Signature Facial for tomorrow at 2:00 PM',
      timestamp: new Date(now.getTime() - 5 * 60000), // 5 mins ago
      read: false,
      actionUrl: '/bookings/new-booking-123',
      actionLabel: 'View booking',
      metadata: {
        bookingId: 'new-booking-123',
        customerName: 'Emma Thompson',
        serviceName: 'Signature Facial',
        time: '2:00 PM'
      }
    },
    {
      id: '2',
      type: 'booking_modified',
      priority: 'info',
      title: 'Booking changed',
      message: 'Michael Chen changed his appointment time to 4:00 PM',
      timestamp: new Date(now.getTime() - 15 * 60000), // 15 mins ago
      read: false,
      actionUrl: '/bookings/modified-booking-456',
      actionLabel: 'View changes',
      metadata: {
        bookingId: 'modified-booking-456',
        customerName: 'Michael Chen',
        time: '4:00 PM'
      }
    },
    {
      id: '3',
      type: 'booking_cancelled',
      priority: 'urgent',
      title: 'Booking cancelled',
      message: 'Sarah Williams cancelled her 3:30 PM appointment',
      timestamp: new Date(now.getTime() - 30 * 60000), // 30 mins ago
      read: false,
      actionUrl: '/calendar',
      actionLabel: 'Fill slot',
      metadata: {
        customerName: 'Sarah Williams',
        time: '3:30 PM'
      }
    },
    {
      id: '4',
      type: 'payment_refunded',
      priority: 'important',
      title: 'Refund processed',
      message: '$120 refunded to Jessica Martinez',
      timestamp: new Date(now.getTime() - 60 * 60000), // 1 hour ago
      read: true,
      actionUrl: '/payments',
      actionLabel: 'View details',
      metadata: {
        amount: 120,
        customerName: 'Jessica Martinez'
      }
    }
  ];

  return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// Helper functions
export function getUnreadCount(notifications: Notification[]): number {
  return notifications.filter(n => !n.read).length;
}

export function groupNotificationsByDate(notifications: Notification[]): {
  today: Notification[];
  yesterday: Notification[];
  older: Notification[];
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  return {
    today: notifications.filter(n => n.timestamp >= today),
    yesterday: notifications.filter(n => n.timestamp >= yesterday && n.timestamp < today),
    older: notifications.filter(n => n.timestamp < yesterday)
  };
}

export function formatNotificationTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-AU', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}