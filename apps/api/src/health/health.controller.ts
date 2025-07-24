import { Controller, Get, Query } from '@nestjs/common';
import { HealthService } from './health.service';
import { QueryMonitorService } from '../common/monitoring/query-monitor.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly queryMonitor: QueryMonitorService,
  ) {}

  @Get()
  @Public()
  async getHealth() {
    return this.healthService.getHealth();
  }

  @Get('database')
  async getDatabaseHealth() {
    return this.healthService.getDatabaseHealth();
  }

  @Get('detailed')
  async getDetailedHealth() {
    return this.healthService.getDetailedHealth();
  }

  @Get('queries')
  async getQueryStats(@Query('since') since?: string) {
    const sinceDate = since ? new Date(since) : undefined;
    return this.queryMonitor.getStats(sinceDate);
  }

  @Get('queries/slow')
  async getSlowQueries(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.queryMonitor.getRecentSlowQueries(limitNum);
  }
}