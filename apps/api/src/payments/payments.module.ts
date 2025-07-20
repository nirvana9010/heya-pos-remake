import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrdersService } from './orders.service';
import { OrderCleanupService } from './order-cleanup.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { TyroPaymentService } from './tyro-payment.service';
import { MockPaymentService } from './mock-payment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RedisModule } from '../common/redis/redis.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule, RedisModule, LoyaltyModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    OrdersService,
    OrderCleanupService,
    PaymentGatewayService,
    TyroPaymentService,
    MockPaymentService,
  ],
  exports: [PaymentsService, OrdersService, PaymentGatewayService],
})
export class PaymentsModule {}