import { Injectable, Logger } from '@nestjs/common';

export interface QueryMetrics {
  model: string;
  action: string;
  duration: number;
  timestamp: Date;
}

export interface QueryStats {
  totalQueries: number;
  averageDuration: number;
  slowQueries: number;
  queriesByModel: Record<string, number>;
  queriesByAction: Record<string, number>;
  slowestQueries: QueryMetrics[];
}

@Injectable()
export class QueryMonitorService {
  private readonly logger = new Logger(QueryMonitorService.name);
  private readonly queries: QueryMetrics[] = [];
  private readonly maxStoredQueries = 10000;
  private readonly slowQueryThreshold = 1000; // 1 second

  recordQuery(model: string, action: string, duration: number) {
    const metric: QueryMetrics = {
      model,
      action,
      duration,
      timestamp: new Date(),
    };

    this.queries.push(metric);

    // Keep only recent queries
    if (this.queries.length > this.maxStoredQueries) {
      this.queries.shift();
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      this.logger.warn(
        `Slow query detected: ${model}.${action} took ${duration}ms`,
      );
    }

    // Log extremely slow queries
    if (duration > 5000) {
      this.logger.error(
        `Extremely slow query: ${model}.${action} took ${duration}ms`,
      );
    }
  }

  getStats(since?: Date): QueryStats {
    const relevantQueries = since
      ? this.queries.filter(q => q.timestamp > since)
      : this.queries;

    if (relevantQueries.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        queriesByModel: {},
        queriesByAction: {},
        slowestQueries: [],
      };
    }

    const totalDuration = relevantQueries.reduce((sum, q) => sum + q.duration, 0);
    const slowQueries = relevantQueries.filter(q => q.duration > this.slowQueryThreshold);
    
    const queriesByModel = relevantQueries.reduce((acc, q) => {
      acc[q.model] = (acc[q.model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const queriesByAction = relevantQueries.reduce((acc, q) => {
      acc[q.action] = (acc[q.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const slowestQueries = [...relevantQueries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      totalQueries: relevantQueries.length,
      averageDuration: Math.round(totalDuration / relevantQueries.length),
      slowQueries: slowQueries.length,
      queriesByModel,
      queriesByAction,
      slowestQueries,
    };
  }

  clearStats() {
    this.queries.length = 0;
    this.logger.log('Query statistics cleared');
  }

  getRecentSlowQueries(limit = 20): QueryMetrics[] {
    return this.queries
      .filter(q => q.duration > this.slowQueryThreshold)
      .slice(-limit);
  }
}