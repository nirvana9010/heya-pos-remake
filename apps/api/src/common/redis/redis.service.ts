import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache HIT for key: ${key}`);
      } else {
        this.logger.debug(`Cache MISS for key: ${key}`);
      }
      return value || null;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache SET for key: ${key} with TTL: ${ttl || 'default'}`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // For Redis store, we can use keys command
      const store = this.cacheManager.store as any;
      if (store.keys) {
        const keys = await store.keys(pattern);
        if (keys.length > 0) {
          await Promise.all(keys.map(key => this.del(key)));
          this.logger.debug(`Cache DEL pattern: ${pattern} (${keys.length} keys)`);
        }
      } else {
        // Fallback for in-memory cache - not pattern-based
        this.logger.warn('Pattern deletion not supported in current cache store');
      }
    } catch (error) {
      this.logger.error(`Error deleting cache pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.debug('Cache RESET');
    } catch (error) {
      this.logger.error('Error resetting cache:', error);
    }
  }

  /**
   * Generate cache key for orders
   */
  static getOrderCacheKey(orderId: string): string {
    return `order:${orderId}`;
  }

  /**
   * Generate cache key for order by booking
   */
  static getOrderByBookingCacheKey(bookingId: string): string {
    return `order:booking:${bookingId}`;
  }

  /**
   * Generate cache key for merchant orders list
   */
  static getMerchantOrdersCacheKey(merchantId: string, state?: string): string {
    return state ? `orders:${merchantId}:${state}` : `orders:${merchantId}:all`;
  }

  /**
   * Generate cache key for payment gateway config
   */
  static getPaymentGatewayCacheKey(merchantId: string): string {
    return `payment:gateway:${merchantId}`;
  }
}