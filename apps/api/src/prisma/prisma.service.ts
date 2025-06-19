import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { memoryLogger } from '../utils/memory-logger';
import { typeConversionMiddleware } from './middleware/type-conversion.middleware';
import { getPrismaConfig, CONNECTION_POOL_CONFIG } from './prisma-config';
import { QueryMonitorService } from '../common/monitoring/query-monitor.service';

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

    // Add type conversion middleware
    this.$use(typeConversionMiddleware());

    // Hook into Prisma middleware to log memory usage
    this.$use(async (params, next) => {
      this.queryCount++;
      const before = Date.now();
      const beforeMemory = process.memoryUsage();

      const result = await next(params);

      const duration = Date.now() - before;
      const memoryDelta = process.memoryUsage().heapUsed - beforeMemory.heapUsed;

      // Log the query and result
      memoryLogger.logQuery(`${params.model}.${params.action}`, params.args, result);

      // Record query metrics
      if (this.queryMonitor && params.model) {
        this.queryMonitor.recordQuery(params.model, params.action, duration);
      }

      // Log slow queries or memory-intensive ones
      if (duration > 100 || memoryDelta > 1024 * 1024) {
        this.logger.warn(`Slow/Heavy query: ${params.model}.${params.action} took ${duration}ms, memory delta: ${Math.round(memoryDelta / 1024)}KB`);
      }

      // Log every 100 queries
      if (this.queryCount % 100 === 0) {
        memoryLogger.logMemory('PrismaService', { totalQueries: this.queryCount });
      }

      return result;
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to database');
      
      // Set connection parameters
      await this.setConnectionParameters();
      
      // Start health check interval
      this.startHealthCheck();
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
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