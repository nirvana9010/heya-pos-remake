'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { headers } from 'next/headers';
import apiClient from '@/lib/api-client';

interface MerchantInfo {
  id: string;
  name: string;
  subdomain: string;
  timezone: string;
  currency: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  description?: string;
  requireDeposit: boolean;
  depositPercentage: number;
  settings?: any;
}

interface MerchantContextType {
  merchant: MerchantInfo | null;
  loading: boolean;
  error: string | null;
  merchantSubdomain: string | null;
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

interface MerchantProviderProps {
  children: ReactNode;
  initialSubdomain?: string;
}

export function MerchantProvider({ children, initialSubdomain }: MerchantProviderProps) {
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [merchantSubdomain, setMerchantSubdomain] = useState<string | null>(initialSubdomain || null);
  const [isClient, setIsClient] = useState(false);
  
  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Detect merchant subdomain if not provided
    if (!merchantSubdomain && isClient) {
      detectMerchantSubdomain();
    }
  }, [merchantSubdomain, isClient]);
  
  const detectMerchantSubdomain = async () => {
    try {
      // Get the base URL from the document to preserve merchant context
      const baseElement = document.querySelector('base');
      const baseHref = baseElement?.getAttribute('href') || '';
      
      // If we have a base URL with merchant, use it
      let apiUrl = '/api/merchant-subdomain';
      if (baseHref && baseHref.includes('/')) {
        const pathParts = baseHref.split('/').filter(Boolean);
        if (pathParts.length > 0 && /^[a-z0-9-]+$/.test(pathParts[0])) {
          apiUrl = `/${pathParts[0]}/api/merchant-subdomain`;
        }
      }
      
      console.log('[MerchantContext] Fetching merchant subdomain from:', apiUrl);
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.subdomain) {
          console.log('[MerchantContext] Detected subdomain from server:', data.subdomain);
          setMerchantSubdomain(data.subdomain);
          apiClient.setMerchantSubdomain(data.subdomain);
          return;
        }
      }
    } catch (error) {
      console.error('[MerchantContext] Failed to get subdomain from server:', error);
    }
    
    // Fallback to client-side detection
    const detectionMode = process.env.NEXT_PUBLIC_MERCHANT_DETECTION_MODE || 'path';
    let detectedSubdomain: string | null = null;
    
    if (detectionMode === 'subdomain') {
      // Extract from hostname
      const parts = window.location.hostname.split('.');
      if (parts.length >= 2 && !['www', 'bookings', 'app', 'api'].includes(parts[0])) {
        detectedSubdomain = parts[0];
      }
    } else if (detectionMode === 'query') {
      // Extract from query params
      const params = new URLSearchParams(window.location.search);
      detectedSubdomain = params.get('merchant');
    }
    
    // For development, default to 'hamilton' if no merchant detected
    if (!detectedSubdomain && process.env.NODE_ENV === 'development') {
      console.log('[MerchantContext] No merchant detected, defaulting to hamilton for development');
      detectedSubdomain = 'hamilton';
    }
    
    if (detectedSubdomain) {
      setMerchantSubdomain(detectedSubdomain);
      apiClient.setMerchantSubdomain(detectedSubdomain);
    }
  };

  useEffect(() => {
    async function fetchMerchantInfo() {
      // Only run on client side
      if (!isClient) {
        return;
      }
      
      if (!merchantSubdomain) {
        setLoading(false);
        setError('No merchant specified');
        return;
      }
      
      // Ensure API client has the subdomain
      apiClient.setMerchantSubdomain(merchantSubdomain);

      try {
        setLoading(true);
        setError(null);
        
        // Try to determine the correct API URL
        let apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        // If no env variable or it's just the path, construct full URL
        if (!apiUrl) {
          // Default to localhost in development
          apiUrl = 'http://localhost:3000/api';
        } else if (!apiUrl.startsWith('http')) {
          // If it's just a path like '/api', prepend the origin
          apiUrl = `${window.location.origin}${apiUrl}`;
        }
        
        const fullUrl = `${apiUrl}/v1/public/merchant-info?subdomain=${merchantSubdomain}`;
        
        console.log('[MerchantContext] Fetch configuration:', {
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
          computedApiUrl: apiUrl,
          fullUrl,
          subdomain: merchantSubdomain,
          windowLocation: window.location.href
        });
        
        console.log('[MerchantContext] Starting fetch...');
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Merchant-Subdomain': merchantSubdomain,
          },
          credentials: 'include',
        });
        console.log('[MerchantContext] Fetch completed:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[MerchantContext] API Error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch merchant info: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Add subdomain to the merchant info
        setMerchant({
          ...data,
          subdomain: merchantSubdomain,
        });
      } catch (err) {
        console.error('[MerchantContext] Direct fetch failed:', err);
        
        // Try using the proxy endpoint as a fallback
        try {
          console.log('[MerchantContext] Trying proxy endpoint...');
          const proxyUrl = `/api/merchant-info?subdomain=${merchantSubdomain}`;
          const proxyResponse = await fetch(proxyUrl);
          
          if (!proxyResponse.ok) {
            throw new Error(`Proxy failed: ${proxyResponse.statusText}`);
          }
          
          const data = await proxyResponse.json();
          console.log('[MerchantContext] Proxy success:', data);
          
          setMerchant({
            ...data,
            subdomain: merchantSubdomain,
          });
          
          // Ensure API client has the subdomain set
          apiClient.setMerchantSubdomain(merchantSubdomain);
          
          return; // Success via proxy
        } catch (proxyErr) {
          console.error('[MerchantContext] Proxy also failed:', proxyErr);
        }
        
        // Both direct and proxy failed
        setError('Unable to load merchant information. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchMerchantInfo();
  }, [merchantSubdomain, isClient]);

  return (
    <MerchantContext.Provider value={{ merchant, loading, error, merchantSubdomain }}>
      {children}
    </MerchantContext.Provider>
  );
}

export function useMerchant() {
  const context = useContext(MerchantContext);
  if (context === undefined) {
    throw new Error('useMerchant must be used within a MerchantProvider');
  }
  return context;
}

// Helper hook for requiring merchant to be loaded
export function useRequiredMerchant() {
  const { merchant, loading, error } = useMerchant();
  
  if (loading) {
    throw new Promise(() => {}); // Suspend for React Suspense
  }
  
  if (error || !merchant) {
    throw new Error(error || 'Merchant not found');
  }
  
  return merchant;
}