/**
 * Cache Configuration - Phase 3 Build System Improvements
 * 
 * Defines caching strategies for different types of data
 * to optimize performance and reduce API calls.
 */

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  staleWhileRevalidate?: number; // Time to serve stale data while fetching fresh
  cacheKey?: (params: any) => string;
  shouldCache?: (data: any) => boolean;
}

// Cache configurations for different endpoints
export const cacheConfigs: Record<string, CacheConfig> = {
  // Static data - cache for longer
  'services': {
    ttl: 0, // Temporarily disable caching to debug pagination
    staleWhileRevalidate: 0,
    shouldCache: () => false,
  },
  
  'staff': {
    ttl: 30 * 60 * 1000, // 30 minutes
    staleWhileRevalidate: 60 * 60 * 1000, // 1 hour
    shouldCache: (data) => Array.isArray(data) && data.length > 0,
  },
  
  'merchant-settings': {
    ttl: 60 * 60 * 1000, // 1 hour
    staleWhileRevalidate: 2 * 60 * 60 * 1000, // 2 hours
  },
  
  'merchant-profile': {
    ttl: 0, // No cache for merchant profile - critical for auth
  },
  
  // Dynamic data - shorter cache
  'bookings': {
    ttl: 2 * 60 * 1000, // 2 minutes
    staleWhileRevalidate: 5 * 60 * 1000, // 5 minutes
    cacheKey: (params) => {
      // Include date range in cache key
      const key = ['bookings'];
      if (params.date) key.push(params.date);
      if (params.startDate) key.push(params.startDate);
      if (params.endDate) key.push(params.endDate);
      if (params.staffId) key.push(params.staffId);
      return key.join(':');
    },
  },
  
  'customers': {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: 10 * 60 * 1000, // 10 minutes
    cacheKey: (params) => {
      const key = ['customers'];
      if (params.search) key.push(params.search);
      if (params.q) key.push(params.q); // Handle search query parameter
      if (params.page) key.push(params.page);
      if (params.limit) key.push(`limit:${params.limit}`);
      return key.join(':');
    },
  },
  
  'dashboard-stats': {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: 10 * 60 * 1000, // 10 minutes
  },
  
  'reports': {
    ttl: 10 * 60 * 1000, // 10 minutes
    staleWhileRevalidate: 30 * 60 * 1000, // 30 minutes
    cacheKey: (params) => {
      const key = ['reports', params.type || 'default'];
      if (params.startDate) key.push(params.startDate);
      if (params.endDate) key.push(params.endDate);
      return key.join(':');
    },
  },
  
  // Real-time data - minimal or no cache
  'payments': {
    ttl: 0, // No cache
  },
  
  'auth': {
    ttl: 0, // No cache for auth endpoints
  },
  
  'notifications': {
    ttl: 0, // No cache for notifications - must be real-time
  },
  
  'merchant/notifications': {
    ttl: 0, // No cache for notifications - must be real-time
  },
};

// Default cache config
export const defaultCacheConfig: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes default
  staleWhileRevalidate: 10 * 60 * 1000, // 10 minutes
};

// Get cache config for an endpoint
export function getCacheConfig(endpoint: string): CacheConfig {
  // Extract the endpoint type from the URL
  const endpointType = Object.keys(cacheConfigs).find(key => 
    endpoint.includes(key) || endpoint.includes(key.replace('-', '/'))
  );
  
  return endpointType ? cacheConfigs[endpointType] : defaultCacheConfig;
}

// Cache key generator
export function generateCacheKey(endpoint: string, params?: any): string {
  const config = getCacheConfig(endpoint);
  
  if (config.cacheKey && params) {
    return config.cacheKey(params);
  }
  
  // Default cache key - include merchant ID to prevent cross-merchant data leaks
  const key = [endpoint];
  
  // Get merchant ID from localStorage to ensure cache isolation
  const merchantStr = typeof window !== 'undefined' ? localStorage.getItem('merchant') : null;
  if (merchantStr) {
    try {
      const merchant = JSON.parse(merchantStr);
      if (merchant.id) {
        key.unshift(`merchant:${merchant.id}`);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  if (params) {
    // Sort params for consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}:${params[k]}`)
      .join(',');
    key.push(sortedParams);
  }
  
  // Add timestamp to force cache busting in development
  if (process.env.NODE_ENV === 'development') {
    key.push(`_t:${Date.now()}`);
  }
  
  return key.join('?');
}

// Check if data should be cached
export function shouldCacheData(endpoint: string, data: any): boolean {
  const config = getCacheConfig(endpoint);
  
  if (config.ttl === 0) return false;
  if (config.shouldCache) return config.shouldCache(data);
  
  // Default: cache successful responses
  return data !== null && data !== undefined;
}

// In-memory cache implementation
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; etag?: string }>();
  
  get(key: string): { data: any; isStale: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const config = getCacheConfig(key);
    const age = Date.now() - entry.timestamp;
    
    if (age > config.ttl + (config.staleWhileRevalidate || 0)) {
      // Too old, remove from cache
      this.cache.delete(key);
      return null;
    }
    
    return {
      data: entry.data,
      isStale: age > config.ttl,
    };
  }
  
  set(key: string, data: any, etag?: string) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      etag,
    });
    
    // Limit cache size
    if (this.cache.size > 100) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      entries.slice(0, 20).forEach(([key]) => this.cache.delete(key));
    }
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(pattern: string) {
    // Delete all keys matching pattern
    Array.from(this.cache.keys())
      .filter(key => key.includes(pattern))
      .forEach(key => this.cache.delete(key));
  }
}

// Export singleton cache instance
export const memoryCache = new MemoryCache();

// Cache invalidation helpers
export function invalidateBookingsCache() {
  memoryCache.delete('bookings');
  console.log('[CacheInvalidation] Invalidated bookings cache');
}

export function invalidateCustomersCache() {
  memoryCache.delete('customers');
  console.log('[CacheInvalidation] Invalidated customers cache');
}

export function invalidateAllCache() {
  memoryCache.clear();
  console.log('[CacheInvalidation] Cleared all cache');
}
