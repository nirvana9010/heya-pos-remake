import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { memoryLogger } from './utils/memory-logger';

// Minimal module for memory leak testing
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    // Modules to test one by one:
    // AuthModule,
    // ServicesModule,
    // CustomersModule,
    // BookingsModule,
    // PaymentsModule,
    // StaffModule,
    // LoyaltyModule,
    // DebugModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor() {
    memoryLogger.logMemory('AppModule initialized (minimal)');
  }
}