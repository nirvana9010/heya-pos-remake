import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { memoryLogger } from '../utils/memory-logger';
import { getPrismaConfig, CONNECTION_POOL_CONFIG } from './prisma-config';
import { QueryMonitorService } from '../common/monitoring/query-monitor.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private queryCount = 0;
  private connectionHealth = {
    isHealthy: true,
    lastCheck: new Date(),
    consecutiveFailures: 0,
  };

  constructor(
    @Optional() @Inject(QueryMonitorService) private queryMonitor?: QueryMonitorService,
  ) {
    const config = getPrismaConfig();
    super(config as Prisma.PrismaClientOptions);

    this.logger.log('PrismaService initialized');
  }

  /**
   * Transform Prisma results to convert Decimal objects to numbers
   * This maintains compatibility with frontend expecting numbers
   */
  transformResult(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.transformResult(item));
    }

    // Handle objects
    if (typeof obj === 'object') {
      const transformed: any = {};

      for (const [key, value] of Object.entries(obj)) {
        if (value instanceof Decimal) {
          // Convert Decimal to number
          transformed[key] = value.toNumber();
        } else if (typeof value === 'object' && value !== null) {
          // Recursively transform nested objects
          transformed[key] = this.transformResult(value);
        } else {
          transformed[key] = value;
        }
      }

      return transformed;
    }

    return obj;
  }

  async onModuleInit() {

    // Note: Using transformResult() method for Decimal conversion
    // instead of deprecated $use middleware
    this.logger.log('✅ Type conversion available via transformResult() method');
    
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Attempting to connect to database (attempt ${attempt}/${maxRetries})`);
        await this.$connect();
        this.logger.log('Prisma connected to database');
        
        // Set connection parameters
        await this.setConnectionParameters();
        
        // Start health check interval
        this.startHealthCheck();
        return; // Success, exit
      } catch (error) {
        this.logger.error(`Failed to connect to database (attempt ${attempt}/${maxRetries})`, error);
        
        if (attempt === maxRetries) {
          throw error; // Final attempt failed
        }
        
        // Wait before retry
        this.logger.log(`Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from database');
  }

  private async setConnectionParameters() {
    try {
      // Set statement timeout
      await this.$executeRawUnsafe(
        `SET statement_timeout = ${CONNECTION_POOL_CONFIG.statement_timeout}`,
      );
      
      // Set idle timeout
      await this.$executeRawUnsafe(
        `SET idle_in_transaction_session_timeout = ${CONNECTION_POOL_CONFIG.idle_in_transaction_session_timeout * 1000}`,
      );
      
      this.logger.log('Database connection parameters set successfully');
    } catch (error) {
      this.logger.warn('Failed to set connection parameters', error);
    }
  }

  private startHealthCheck() {
    setInterval(async () => {
      try {
        const start = Date.now();
        await this.$queryRaw`SELECT 1`;
        const duration = Date.now() - start;
        
        this.connectionHealth = {
          isHealthy: true,
          lastCheck: new Date(),
          consecutiveFailures: 0,
        };
        
        if (duration > 1000) {
          this.logger.warn(`Slow database health check: ${duration}ms`);
        }
      } catch (error) {
        this.connectionHealth.consecutiveFailures++;
        this.connectionHealth.isHealthy = false;
        
        this.logger.error(
          `Database health check failed (${this.connectionHealth.consecutiveFailures} consecutive failures)`,
          error,
        );
        
        // If too many consecutive failures, try to reconnect
        if (this.connectionHealth.consecutiveFailures >= 3) {
          this.logger.warn('Attempting to reconnect to database...');
          try {
            await this.$disconnect();
            await this.$connect();
            this.logger.log('Successfully reconnected to database');
          } catch (reconnectError) {
            this.logger.error('Failed to reconnect to database', reconnectError);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  getConnectionHealth() {
    return {
      ...this.connectionHealth,
      queryCount: this.queryCount,
    };
  }
}