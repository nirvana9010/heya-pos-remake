import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import * as dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';

// Load environment variables
dotenv.config();

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
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'http://localhost:3000']
      : true,
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`API server running on http://localhost:${port}/api`);
}
bootstrap();