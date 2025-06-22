'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import { useNotifications } from '@/contexts/notifications-context';
import { notificationConfig, formatNotificationTime, NotificationType } from '@/lib/notifications';
import { Calendar, XCircle, Edit, RefreshCw, Check, Inbox, Filter, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@heya-pos/ui';
import { useState } from 'react';

const iconMap = {
  Calendar,
  XCircle,
  Edit,
  RefreshCw,
};

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, clearNotification, clearAll } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const notificationTypes = Array.from(new Set(notifications.map(n => n.type)));

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your business activities
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All ({notifications.length})
                </Button>
                <Button
                  variant={filter === 'unread' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('unread')}
                >
                  Unread ({notifications.filter(n => !n.read).length})
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as NotificationType | 'all')}
                className="text-sm border rounded-md px-3 py-1"
              >
                <option value="all">All types</option>
                {notificationTypes.map(type => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filter === 'unread' 
                  ? "You've read all your notifications!" 
                  : "New notifications will appear here."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => {
            const config = notificationConfig[notification.type as NotificationType];
            const Icon = iconMap[config.icon as keyof typeof iconMap];

            return (
              <Card
                key={notification.id}
                className={cn(
                  "transition-all hover:shadow-md cursor-pointer",
                  !notification.read && "border-primary/50 bg-accent/5"
                )}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className={cn("mt-1", config.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notification.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatNotificationTime(notification.timestamp)}
                        </span>
                        
                        {notification.actionUrl && (
                          <Link
                            href={notification.actionUrl}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {notification.actionLabel || 'View'} →
                          </Link>
                        )}
                      </div>
                    </div>
                    
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}