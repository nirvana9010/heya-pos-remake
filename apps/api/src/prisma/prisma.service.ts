import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { memoryLogger } from '../utils/memory-logger';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private queryCount = 0;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

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
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from database');
  }
}