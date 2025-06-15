"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { bookingApi } from '@/lib/booking-api';
import { TimezoneUtils } from '@heya-pos/utils';

interface TimezoneContextType {
  merchantTimezone: string;
  userTimezone: string;
  loading: boolean;
  formatInMerchantTz: (date: Date | string, format?: string) => string;
  formatInUserTz: (date: Date | string, format?: string) => string;
  getTimezoneOffset: (timezone: string) => string;
  getCurrentTimezoneAbbr: (timezone: string) => string;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export const useTimezone = () => {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
};

export const TimezoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [merchantTimezone, setMerchantTimezone] = useState('Australia/Sydney');
  const [userTimezone, setUserTimezone] = useState('Australia/Sydney');
  const [loading, setLoading] = useState(true);

  // Load merchant timezone on mount
  useEffect(() => {
    const loadTimezone = async () => {
      try {
        // Get merchant info which includes timezone
        const merchantData = await bookingApi.getMerchantInfo();
        if (merchantData?.timezone) {
          setMerchantTimezone(merchantData.timezone);
        }

        // Detect user's browser timezone
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (userTz) {
          setUserTimezone(userTz);
        }
      } catch (error) {
        console.error('Failed to load timezone settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTimezone();
  }, []);

  const formatInMerchantTz = (date: Date | string, format?: string) => {
    return TimezoneUtils.formatInTimezone(date, merchantTimezone, format);
  };

  const formatInUserTz = (date: Date | string, format?: string) => {
    return TimezoneUtils.formatInTimezone(date, userTimezone, format);
  };

  const getTimezoneOffset = (timezone: string) => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    const parts = formatter.formatToParts(now);
    const tzName = parts.find(part => part.type === 'timeZoneName')?.value || '';
    return tzName;
  };

  const getCurrentTimezoneAbbr = (timezone: string) => {
    return getTimezoneOffset(timezone);
  };

  const value = {
    merchantTimezone,
    userTimezone,
    loading,
    formatInMerchantTz,
    formatInUserTz,
    getTimezoneOffset,
    getCurrentTimezoneAbbr,
  };

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
};