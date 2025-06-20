'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Notification, generateMockNotifications, getUnreadCount } from '@/lib/notifications';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Initialize with mock data in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setNotifications(generateMockNotifications());
    }
    
    // Load persisted notifications from localStorage
    const stored = localStorage.getItem('merchant-notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      } catch (e) {
        console.error('Failed to parse stored notifications:', e);
      }
    }
  }, []);

  // Persist notifications to localStorage
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('merchant-notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem('merchant-notifications');
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Play notification sound if enabled
    if ('Audio' in window) {
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore audio play errors (user hasn't interacted yet)
        });
      } catch (e) {
        // Ignore audio errors
      }
    }
  }, []);

  // DISABLED: Simulated notifications - not needed for MVP
  // This was causing random notifications to appear every 30 seconds
  /*
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const interval = setInterval(() => {
      // Implementation disabled
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [addNotification]);
  */

  const unreadCount = getUnreadCount(notifications);

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAll,
      addNotification
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}