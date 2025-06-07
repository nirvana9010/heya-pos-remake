import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import * as dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';
import { memoryLogger } from './utils/memory-logger';

// Load environment variables
dotenv.config();

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
  
  // Enable global performance monitoring
  app.useGlobalInterceptors(new PerformanceInterceptor());
  
  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Enable CORS
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(url => url.trim())
    : true;
    
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`API server running on http://localhost:${port}/api`);
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