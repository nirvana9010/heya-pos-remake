"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { TimezoneUtils } from '@heya-pos/utils';

interface TimezoneContextType {
  merchantTimezone: string;
  locationTimezone: string | null;
  userTimezone: string;
  loading: boolean;
  updateMerchantTimezone: (timezone: string) => Promise<void>;
  updateLocationTimezone: (locationId: string, timezone: string) => Promise<void>;
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
  const [locationTimezone, setLocationTimezone] = useState<string | null>(null);
  const [userTimezone, setUserTimezone] = useState('Australia/Sydney');
  const [loading, setLoading] = useState(true);

  // Load merchant and location timezone on mount
  useEffect(() => {
    const loadTimezones = async () => {
      // Always detect user's browser timezone first
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userTz) {
        setUserTimezone(userTz);
      }

      try {
        // Try to get merchant settings
        try {
          const settings = await apiClient.get('/merchant/settings');
          if (settings?.timezone) {
            setMerchantTimezone(settings.timezone);
          }
        } catch (err) {
          // Merchant settings failed, use default
        }

        // Try to get first location
        try {
          const locations = await apiClient.getLocations();
          if (locations?.length > 0 && locations[0].timezone) {
            setLocationTimezone(locations[0].timezone);
          }
        } catch (err) {
          // Location fetch failed, that's ok
        }
      } catch (error) {
        // Silently handle errors - we have defaults
      } finally {
        setLoading(false);
      }
    };

    loadTimezones();
  }, []);

  const updateMerchantTimezone = async (timezone: string) => {
    await apiClient.put('/merchant/settings', { timezone });
    setMerchantTimezone(timezone);
  };

  const updateLocationTimezone = async (locationId: string, timezone: string) => {
    await apiClient.updateLocationTimezone(locationId, timezone);
    setLocationTimezone(timezone);
  };

  const formatInMerchantTz = (date: Date | string, format?: string) => {
    const tz = locationTimezone || merchantTimezone;
    return TimezoneUtils.formatInTimezone(date, tz, format);
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
    locationTimezone,
    userTimezone,
    loading,
    updateMerchantTimezone,
    updateLocationTimezone,
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