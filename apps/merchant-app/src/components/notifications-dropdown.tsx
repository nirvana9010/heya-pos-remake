'use client';

import { Bell, Calendar, DollarSign, XCircle, Edit, Clock, AlertCircle, RefreshCw, UserX, UserMinus, Star, Gift, AlertTriangle, TrendingUp, Check, X, ExternalLink, Inbox } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
  Badge,
  ScrollArea,
} from '@heya-pos/ui';
import { useNotifications } from '@/contexts/notifications-context';
import { notificationConfig, formatNotificationTime, groupNotificationsByDate, NotificationType } from '@/lib/notifications';
import Link from 'next/link';
import { cn } from '@heya-pos/ui';

const iconMap = {
  Calendar,
  XCircle,
  Edit,
  Clock,
  DollarSign,
  AlertCircle,
  RefreshCw,
  UserX,
  UserMinus,
  Star,
  Gift,
  AlertTriangle,
  TrendingUp,
};

export function NotificationsDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAll } = useNotifications();
  const grouped = groupNotificationsByDate(notifications);

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const renderNotification = (notification: any) => {
    const config = notificationConfig[notification.type as NotificationType];
    const Icon = iconMap[config.icon as keyof typeof iconMap];

    return (
      <div
        key={notification.id}
        className={cn(
          "relative px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer",
          !notification.read && "bg-accent/20"
        )}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex gap-3">
          <div className={cn("mt-0.5", config.color)}>
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-tight">
                {notification.title}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearNotification(notification.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {notification.message}
            </p>
            
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {formatNotificationTime(notification.timestamp)}
              </span>
              
              {notification.actionUrl && (
                <Link
                  href={notification.actionUrl}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  {notification.actionLabel || 'View'}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {!notification.read && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
        )}
      </div>
    );
  };

  const renderGroup = (title: string, items: any[]) => {
    if (items.length === 0) return null;
    
    return (
      <>
        <div className="px-4 py-2 bg-muted/50">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
        </div>
        <div className="group">
          {items.map(renderNotification)}
        </div>
      </>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="btn btn-ghost btn-sm relative">
          <Bell size={18} />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-[380px] p-0"
        style={{ maxHeight: '80vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[500px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                You're all caught up! New notifications will appear here.
              </p>
            </div>
          ) : (
            <>
              {renderGroup('Today', grouped.today)}
              {renderGroup('Yesterday', grouped.yesterday)}
              {renderGroup('Older', grouped.older)}
            </>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="border-t p-3">
            <Link href="/notifications">
              <Button variant="ghost" className="w-full justify-center text-sm">
                View all notifications
              </Button>
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}