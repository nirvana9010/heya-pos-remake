import { Controller, Get, UseGuards, Req, Post, Headers } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { PrismaService } from './prisma/prisma.service';
import { execSync } from 'child_process';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string; database?: string } {
    return this.appService.getHealth();
  }

  // Temporary migration endpoint - REMOVE AFTER USE
  @Post('migrate-database-one-time')
  async runMigrations(@Headers('x-migration-key') migrationKey: string) {
    // Simple security check
    if (migrationKey !== process.env.JWT_SECRET) {
      return { error: 'Unauthorized' };
    }

    if (process.env.NODE_ENV !== 'production') {
      return { error: 'Only run in production' };
    }

    try {
      // Run migrations
      const output = execSync('npx prisma migrate deploy', { encoding: 'utf8' });
      
      // Check database is accessible
      const merchantCount = await this.prisma.merchant.count();
      
      return { 
        success: true, 
        output,
        merchantCount,
        message: 'Migrations completed successfully' 
      };
    } catch (error: any) {
      return { 
        error: 'Migration failed', 
        details: error.message 
      };
    }
  }

  @Get('debug/auth')
  @UseGuards(JwtAuthGuard)
  debugAuth(@Req() req: any, @CurrentUser() user: any) {
    return {
      hasUser: !!req.user,
      hasSession: !!req.session,
      user: req.user,
      currentUser: user,
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing'
      }
    };
  }

  @Get('test/customers')
  @UseGuards(JwtAuthGuard)
  async testCustomers(@CurrentUser() user: any) {
    return {
      message: 'Test endpoint',
      user: {
        id: user?.id,
        merchantId: user?.merchantId,
        type: user?.type
      }
    };
  }
}