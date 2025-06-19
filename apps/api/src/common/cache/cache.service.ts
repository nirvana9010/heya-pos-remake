import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 300000; // 5 minutes

  constructor(private readonly configService: ConfigService) {
    // Clear expired entries every minute
    setInterval(() => this.clearExpiredEntries(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`Cache hit for key: ${key}`);
    return entry.data as T;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      data,
      expiresAt,
    });

    this.logger.debug(`Cached data for key: ${key}, expires at: ${new Date(expiresAt).toISOString()}`);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.logger.debug(`Deleted cache for key: ${key}`);
  }

  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.logger.debug(`Deleted ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.logger.debug('Cleared all cache entries');
  }

  private clearExpiredEntries(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.debug(`Cleared ${deletedCount} expired cache entries`);
    }
  }

  // Generate cache key with merchant context
  generateKey(merchantId: string, prefix: string, ...parts: any[]): string {
    const cleanParts = parts
      .filter(part => part !== undefined && part !== null)
      .map(part => String(part));
    
    return `${merchantId}:${prefix}:${cleanParts.join(':')}`;
  }
}