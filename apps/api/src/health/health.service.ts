import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
}

export interface DatabaseHealth {
  status: "healthy" | "unhealthy";
  responseTime: number;
  connectionHealth: any;
}

export interface DetailedHealth extends HealthStatus {
  database: DatabaseHealth;
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
    external: string;
  };
  performance: {
    cpuUsage: NodeJS.CpuUsage;
    loadAverage: number[];
  };
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthStatus> {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || "0.0.1",
    };
  }

  async getDatabaseHealth(): Promise<DatabaseHealth> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      const connectionHealth = this.prisma.getConnectionHealth();

      return {
        status: connectionHealth.isHealthy ? "healthy" : "unhealthy",
        responseTime,
        connectionHealth,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        responseTime: -1,
        connectionHealth: {
          isHealthy: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  async getDetailedHealth(): Promise<DetailedHealth> {
    const [basic, database] = await Promise.all([
      this.getHealth(),
      this.getDatabaseHealth(),
    ]);

    const memoryUsage = process.memoryUsage();
    const memory = {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
    };

    const performance = {
      cpuUsage: process.cpuUsage(),
      loadAverage: require("os").loadavg(),
    };

    // Determine overall health status
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (database.status === "unhealthy") {
      overallStatus = "unhealthy";
    } else if (database.responseTime > 1000) {
      overallStatus = "degraded";
    }

    return {
      ...basic,
      status: overallStatus,
      database,
      memory,
      performance,
    };
  }
}
