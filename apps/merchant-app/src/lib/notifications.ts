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