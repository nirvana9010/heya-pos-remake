import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrdersService } from './orders.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { TyroPaymentService } from './tyro-payment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    OrdersService,
    PaymentGatewayService,
    TyroPaymentService,
  ],
  exports: [PaymentsService, OrdersService, PaymentGatewayService],
})
export class PaymentsModule {}