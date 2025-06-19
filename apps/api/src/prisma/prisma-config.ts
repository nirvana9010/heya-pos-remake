export interface PrismaConfig {
  datasources: {
    db: {
      url: string;
    };
  };
  log?: Array<'query' | 'info' | 'warn' | 'error'>;
  errorFormat?: 'pretty' | 'colorless' | 'minimal';
}

export function getPrismaConfig(): PrismaConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  // Base configuration
  const config: PrismaConfig = {
    datasources: {
      db: {
        url: process.env.DATABASE_URL!,
      },
    },
    errorFormat: isDevelopment ? 'pretty' : 'minimal',
  };

  // Logging configuration
  if (isDevelopment) {
    config.log = ['query', 'error', 'warn'];
  } else if (process.env.PRISMA_LOG_QUERIES === 'true') {
    config.log = ['error', 'warn'];
  } else {
    config.log = ['error'];
  }

  return config;
}

// Connection pool configuration for Prisma
// Note: When using PgBouncer, these are handled at the pooler level
export const CONNECTION_POOL_CONFIG = {
  // Maximum number of connections in the pool
  connection_limit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10'),
  
  // Pool timeout in seconds (how long to wait for a connection)
  pool_timeout: parseInt(process.env.DATABASE_POOL_TIMEOUT || '10'),
  
  // Idle timeout in seconds (how long a connection can be idle before being closed)
  idle_in_transaction_session_timeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '10'),
  
  // Statement timeout in milliseconds
  statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '30000'),
};

// Health check query options
export const HEALTH_CHECK_CONFIG = {
  // Timeout for health check queries
  timeout: 5000,
  
  // Retry count for health checks
  retries: 3,
  
  // Interval between health checks (ms)
  interval: 30000,
};