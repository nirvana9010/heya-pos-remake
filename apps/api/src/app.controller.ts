import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
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