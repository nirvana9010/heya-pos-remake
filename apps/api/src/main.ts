import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { TypeTransformationInterceptor } from './common/interceptors/type-transformation.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import * as dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';
import { memoryLogger } from './utils/memory-logger';

// Ensure crypto is available globally for uuid package
import * as crypto from 'crypto';
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = crypto as any;
}

// Load environment variables
dotenv.config();

// Debug: Log environment variables
console.log('=== ENVIRONMENT VARIABLES CHECK ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 80) + '...' : 'NOT SET');
console.log('DIRECT_URL:', process.env.DIRECT_URL ? process.env.DIRECT_URL.substring(0, 80) + '...' : 'NOT SET');
console.log('DATABASE_CONNECTION_LIMIT:', process.env.DATABASE_CONNECTION_LIMIT);
console.log('===================================\n');

// Log initial memory state
memoryLogger.logMemory('Application Start');

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });


  // Enable compression
  app.use(compression());

  // Enable helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable for API
    })
  );
  
  // Enable global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Enable global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new PerformanceInterceptor(),
    new TypeTransformationInterceptor(),
  );
  
  // Enable validation with custom pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    errorHttpStatusCode: 400,
  }));

  // Enable CORS
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(url => url.trim())
    : true;
    
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Merchant-Subdomain'],
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1', // Default to v1 for backward compatibility
  });

  const port = process.env.PORT || 3000;
  const host = '0.0.0.0'; // Bind to all interfaces for Railway
  await app.listen(port, host);
  
  logger.log(`API server running on http://${host}:${port}/api`);
  memoryLogger.logMemory('Application Ready');

  // Log memory every 30 seconds
  setInterval(() => {
    memoryLogger.logMemory('Periodic Check');
  }, 30000);

  // Handle shutdown gracefully
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully...');
    memoryLogger.logMemory('Shutdown');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});