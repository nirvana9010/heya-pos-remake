import { cookies } from 'next/headers';
import { cache } from 'react';

interface MerchantFeatures {
  enabledFeatures: string[];
  disabledFeatures: string[];
  overrides: Record<string, any>;
  packageFeatures: string[];
  packageName: string;
}

// React cache ensures this is only called once per request
export const getServerFeatures = cache(async (): Promise<MerchantFeatures | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    
    if (!token) {
      console.log('[ServerFeatures] No auth token found');
      return null;
    }
    
    // Make API call from server
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const url = `${apiUrl}/v1/features`;
    
    console.log('[ServerFeatures] Fetching from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Important: opt out of Next.js fetch caching for fresh data
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('[ServerFeatures] Failed to fetch:', response.status);
      const text = await response.text();
      console.error('[ServerFeatures] Response:', text);
      return null;
    }
    
    const data = await response.json();
    console.log('[ServerFeatures] Loaded features:', data);
    return data;
  } catch (error) {
    console.error('[ServerFeatures] Error:', error);
    return null;
  }
});

export function hasServerFeature(features: MerchantFeatures | null, featureId: string): boolean {
  if (!features) return true; // Show all features if we can't load
  return features.enabledFeatures.includes(featureId);
}