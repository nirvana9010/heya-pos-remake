export type NotificationType = 
  | 'booking_new'
  | 'booking_cancelled'
  | 'booking_modified'
  | 'booking_reminder'
  | 'payment_received'
  | 'payment_failed'
  | 'payment_refunded'
  | 'staff_late'
  | 'staff_timeoff'
  | 'customer_vip'
  | 'customer_birthday'
  | 'system_alert'
  | 'business_insight';

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

// Notification type configurations
export const notificationConfig: Record<NotificationType, {
  icon: string;
  color: string;
  priority: NotificationPriority;
}> = {
  booking_new: { icon: 'Calendar', color: 'text-blue-600', priority: 'important' },
  booking_cancelled: { icon: 'XCircle', color: 'text-red-600', priority: 'urgent' },
  booking_modified: { icon: 'Edit', color: 'text-orange-600', priority: 'info' },
  booking_reminder: { icon: 'Clock', color: 'text-purple-600', priority: 'info' },
  payment_received: { icon: 'DollarSign', color: 'text-green-600', priority: 'info' },
  payment_failed: { icon: 'AlertCircle', color: 'text-red-600', priority: 'urgent' },
  payment_refunded: { icon: 'RefreshCw', color: 'text-orange-600', priority: 'important' },
  staff_late: { icon: 'UserX', color: 'text-orange-600', priority: 'urgent' },
  staff_timeoff: { icon: 'UserMinus', color: 'text-blue-600', priority: 'important' },
  customer_vip: { icon: 'Star', color: 'text-yellow-600', priority: 'info' },
  customer_birthday: { icon: 'Gift', color: 'text-pink-600', priority: 'info' },
  system_alert: { icon: 'AlertTriangle', color: 'text-red-600', priority: 'urgent' },
  business_insight: { icon: 'TrendingUp', color: 'text-indigo-600', priority: 'info' },
};

// Mock notification generator for development
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
      type: 'payment_received',
      priority: 'info',
      title: 'Payment completed',
      message: '$180 received from Michael Chen via Square',
      timestamp: new Date(now.getTime() - 15 * 60000), // 15 mins ago
      read: false,
      metadata: {
        amount: 180,
        customerName: 'Michael Chen'
      }
    },
    {
      id: '3',
      type: 'booking_cancelled',
      priority: 'urgent',
      title: 'Last-minute cancellation',
      message: 'Sarah Williams cancelled her 3:30 PM appointment (in 1 hour)',
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
      type: 'customer_vip',
      priority: 'info',
      title: 'VIP customer booking',
      message: 'Jessica Martinez (Gold member) just booked for next week',
      timestamp: new Date(now.getTime() - 60 * 60000), // 1 hour ago
      read: true,
      actionUrl: '/customers/vip-123',
      metadata: {
        customerId: 'vip-123',
        customerName: 'Jessica Martinez'
      }
    },
    {
      id: '5',
      type: 'staff_late',
      priority: 'urgent',
      title: 'Staff running late',
      message: 'Emma Williams will be 15 minutes late - has 2 appointments affected',
      timestamp: new Date(now.getTime() - 2 * 60 * 60000), // 2 hours ago
      read: true,
      actionUrl: '/calendar',
      actionLabel: 'Reschedule',
      metadata: {
        staffId: 'staff-123'
      }
    },
    {
      id: '6',
      type: 'business_insight',
      priority: 'info',
      title: 'Weekly summary ready',
      message: 'Revenue up 15% from last week. View detailed insights.',
      timestamp: new Date(now.getTime() - 24 * 60 * 60000), // Yesterday
      read: true,
      actionUrl: '/reports',
      actionLabel: 'View report'
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