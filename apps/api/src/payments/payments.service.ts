import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { 
  ProcessPaymentDto, 
  SplitPaymentDto,
  PaymentMethod, 
  PaymentStatus,
  OrderState,
} from '@heya-pos/types';
import { Decimal } from '@prisma/client/runtime/library';
import { MerchantNotificationsService } from '../notifications/merchant-notifications.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly gatewayService: PaymentGatewayService,
    private readonly merchantNotificationsService: MerchantNotificationsService,
  ) {}

  /**
   * Process a single payment for an order
   */
  async processPayment(dto: ProcessPaymentDto, merchantId: string, staffId: string) {
    const startTime = Date.now();
    
    // Step 1: Get order with minimal data for validation (no heavy includes)
    const order = await this.prisma.order.findFirst({
      where: { 
        id: dto.orderId, 
        merchantId 
      },
      select: {
        id: true,
        state: true,
        balanceDue: true,
        subtotal: true,
        totalAmount: true,
        paidAmount: true,
      }
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Validate order state
    if (order.state !== OrderState.PENDING_PAYMENT && 
        order.state !== OrderState.PARTIALLY_PAID &&
        order.state !== OrderState.LOCKED) {
      throw new BadRequestException('Order is not ready for payment');
    }

    // Check if payment amount is valid
    const balanceDue = typeof order.balanceDue === 'object' && order.balanceDue.toNumber
      ? order.balanceDue.toNumber()
      : Number(order.balanceDue);
    
    if (dto.amount > balanceDue) {
      throw new BadRequestException('Payment amount exceeds balance due');
    }

    console.log(`[ProcessPayment] Validation done in ${Date.now() - startTime}ms`);

    // Lock the order if it's still in draft state
    if (order.state === OrderState.LOCKED) {
      await this.ordersService.updateOrderState(order.id, merchantId, OrderState.PENDING_PAYMENT);
    }

    // Process based on payment method
    let paymentResult;
    const paymentStartTime = Date.now();
    
    switch (dto.method) {
      case PaymentMethod.CASH:
        paymentResult = await this.processCashPayment(order.id, dto, staffId);
        break;
      
      case PaymentMethod.CARD:
        paymentResult = await this.processCardPayment(order.id, dto, staffId);
        break;
      
      default:
        paymentResult = await this.processGenericPayment(order.id, dto, staffId);
    }
    
    console.log(`[ProcessPayment] Payment processed in ${Date.now() - paymentStartTime}ms`);

    // Update order state in background (non-blocking)
    // This includes recalculating totals which is expensive
    this.updateOrderPaymentStateAsync(order.id, merchantId)
      .catch(error => {
        console.error('[ProcessPayment] Failed to update order state:', error);
        // Don't throw - payment is already processed
      });

    console.log(`[ProcessPayment] Total time: ${Date.now() - startTime}ms`);
    
    return paymentResult;
  }
  
  /**
   * Async version of updateOrderPaymentState that doesn't block the response
   */
  private async updateOrderPaymentStateAsync(orderId: string, merchantId: string) {
    try {
      await this.updateOrderPaymentState(orderId, merchantId);
    } catch (error) {
      console.error(`[UpdateOrderState] Failed for order ${orderId}:`, error);
      // Log but don't throw - payment is already processed
    }
  }

  /**
   * Process split payments for an order
   */
  async processSplitPayment(dto: SplitPaymentDto, merchantId: string, staffId: string) {
    const order = await this.ordersService.findOrder(dto.orderId, merchantId);

    // Validate total amount
    const totalPaymentAmount = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaymentAmount !== order.balanceDue.toNumber()) {
      throw new BadRequestException('Split payment amounts must equal balance due');
    }

    // Process each payment
    const results = [];
    for (const payment of dto.payments) {
      const paymentDto: ProcessPaymentDto = {
        orderId: dto.orderId,
        amount: payment.amount,
        method: payment.method,
        tipAmount: payment.tipAmount,
        reference: payment.reference,
      };

      const result = await this.processPayment(paymentDto, merchantId, staffId);
      results.push(result);
    }

    return results;
  }

  /**
   * Process cash payment
   */
  private async processCashPayment(orderId: string, dto: ProcessPaymentDto, staffId: string) {
    const payment = await this.prisma.orderPayment.create({
      data: {
        orderId,
        paymentMethod: PaymentMethod.CASH,
        amount: new Decimal(dto.amount),
        tipAmount: new Decimal(dto.tipAmount || 0),
        status: PaymentStatus.COMPLETED,
        reference: dto.reference,
        processedById: staffId,
        processedAt: new Date(),
        gatewayResponse: dto.metadata,
      },
      include: {
        order: true,
      },
    });

    // Handle tip allocation if tips are enabled and provided
    if (dto.tipAmount && dto.tipAmount > 0) {
      await this.allocateTips(payment.id, dto.tipAmount, dto.metadata?.tipAllocations);
    }

    return {
      payment,
      changeAmount: dto.metadata?.cashReceived ? dto.metadata.cashReceived - dto.amount : 0,
    };
  }

  /**
   * Process card payment via gateway
   */
  private async processCardPayment(orderId: string, dto: ProcessPaymentDto, staffId: string) {
    // Get or create payment reference
    let reference = dto.reference;
    if (!reference) {
      // Create terminal payment first to get reference
      reference = await this.gatewayService.createTerminalPayment(dto.amount, orderId);
    }

    // Create pending payment record
    const payment = await this.prisma.orderPayment.create({
      data: {
        orderId,
        paymentMethod: dto.method,
        amount: new Decimal(dto.amount),
        tipAmount: new Decimal(dto.tipAmount || 0),
        status: PaymentStatus.PROCESSING,
        reference: reference,
        processedById: staffId,
      },
    });

    try {
      // Process through gateway
      const gatewayResult = await this.gatewayService.getTerminalStatus(reference);

      if (gatewayResult.success) {
        // Update payment as completed
        await this.prisma.orderPayment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            processedAt: new Date(),
            gatewayResponse: gatewayResult.gatewayResponse,
          },
        });

        // Handle tip allocation
        if (dto.tipAmount && dto.tipAmount > 0) {
          await this.allocateTips(payment.id, dto.tipAmount, dto.metadata?.tipAllocations);
        }
      } else {
        // Update payment as failed
        await this.prisma.orderPayment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failedAt: new Date(),
            failureReason: gatewayResult.error,
            gatewayResponse: gatewayResult.gatewayResponse,
          },
        });
      }

      return { payment: await this.prisma.orderPayment.findUnique({ where: { id: payment.id } }) };
    } catch (error) {
      // Update payment as failed
      await this.prisma.orderPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          failureReason: (error as any).message || 'Unknown error',
        },
      });
      throw error;
    }
  }

  /**
   * Process generic payment method
   */
  private async processGenericPayment(orderId: string, dto: ProcessPaymentDto, staffId: string) {
    const payment = await this.prisma.orderPayment.create({
      data: {
        orderId,
        paymentMethod: dto.method,
        amount: new Decimal(dto.amount),
        tipAmount: new Decimal(dto.tipAmount || 0),
        status: PaymentStatus.COMPLETED,
        reference: dto.reference,
        processedById: staffId,
        processedAt: new Date(),
        gatewayResponse: dto.metadata,
      },
    });

    return { payment };
  }

  /**
   * Allocate tips to staff
   */
  private async allocateTips(
    orderPaymentId: string, 
    tipAmount: number, 
    allocations?: Array<{ staffId: string; amount?: number; percentage?: number }>
  ) {
    if (!allocations || allocations.length === 0) {
      // Default: allocate to order items staff evenly
      const payment = await this.prisma.orderPayment.findUnique({
        where: { id: orderPaymentId },
        include: {
          order: {
            include: {
              items: {
                where: { staffId: { not: null } },
              },
            },
          },
        },
      });

      if (payment && payment.order.items.length > 0) {
        const staffIds = [...new Set(payment.order.items.map(item => item.staffId!))];
        const amountPerStaff = tipAmount / staffIds.length;

        allocations = staffIds.map(staffId => ({
          staffId,
          amount: amountPerStaff,
        }));
      }
    }

    if (allocations) {
      await Promise.all(
        allocations.map(allocation =>
          this.prisma.tipAllocation.create({
            data: {
              orderPaymentId,
              staffId: allocation.staffId,
              amount: new Decimal(allocation.amount || (tipAmount * (allocation.percentage || 0) / 100)),
              percentage: allocation.percentage ? new Decimal(allocation.percentage) : null,
            },
          })
        )
      );
    }
  }

  /**
   * Update order payment state
   */
  private async updateOrderPaymentState(orderId: string, merchantId: string) {
    await this.ordersService.recalculateOrderTotals(orderId);
    const order = await this.ordersService.findOrder(orderId, merchantId);

    // Convert to numbers for comparison
    const balanceDue = typeof order.balanceDue === 'object' && order.balanceDue.toNumber
      ? order.balanceDue.toNumber()
      : Number(order.balanceDue);
    const paidAmount = typeof order.paidAmount === 'object' && order.paidAmount.toNumber
      ? order.paidAmount.toNumber()
      : Number(order.paidAmount);

    let newState: OrderState;
    if (balanceDue === 0) {
      newState = OrderState.PAID;
    } else if (paidAmount > 0) {
      newState = OrderState.PARTIALLY_PAID;
    } else {
      return; // No state change needed
    }

    await this.ordersService.updateOrderState(orderId, merchantId, newState);
  }

  /**
   * Process refund
   */
  async refundPayment(paymentId: string, amount: number, reason: string, merchantId: string) {
    const payment = await this.prisma.orderPayment.findFirst({
      where: {
        id: paymentId,
        order: { merchantId },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Can only refund completed payments');
    }

    // Check refund amount
    const refunded = await this.prisma.orderPayment.findMany({
      where: {
        orderId: payment.orderId,
        status: PaymentStatus.REFUNDED,
      },
    });

    const totalRefunded = refunded.reduce((sum, r) => sum.add(r.amount), new Decimal(0));
    if (amount > payment.amount.sub(totalRefunded).toNumber()) {
      throw new BadRequestException('Refund amount exceeds refundable balance');
    }

    // Process refund based on payment method
    let refundResult;
    if (payment.paymentMethod === PaymentMethod.CARD) {
      refundResult = await this.gatewayService.refundPayment(payment.id, amount, reason);
    }

    // Create refund record
    const refund = await this.prisma.orderPayment.create({
      data: {
        orderId: payment.orderId,
        paymentMethod: payment.paymentMethod,
        amount: new Decimal(-amount), // Negative amount for refund
        status: refundResult?.success ? PaymentStatus.REFUNDED : PaymentStatus.FAILED,
        reference: refundResult?.refundId,
        gatewayResponse: { 
          originalPaymentId: payment.id,
          reason,
          ...refundResult,
        },
        processedAt: refundResult?.success ? new Date() : null,
        failedAt: refundResult?.success ? null : new Date(),
        failureReason: refundResult?.error,
      },
    });

    // Update order state if needed
    if (refundResult?.success) {
      await this.updateOrderPaymentState(payment.orderId, merchantId);
      
      // Create merchant notification for successful refund
      // First get the order with customer details
      const order = await this.prisma.order.findUnique({
        where: { id: payment.orderId },
        include: {
          customer: true,
        },
      });
      
      if (order && order.customer) {
        const customerName = order.customer.lastName 
          ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
          : order.customer.firstName;
        await this.merchantNotificationsService.createRefundNotification(
          merchantId,
          {
            paymentId: refund.id,
            customerName,
            amount,
          }
        );
      }
    }

    return refund;
  }

  /**
   * Void a payment (for same-day cancellations)
   */
  async voidPayment(paymentId: string, merchantId: string) {
    const payment = await this.prisma.orderPayment.findFirst({
      where: {
        id: paymentId,
        order: { merchantId },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Can only void completed payments');
    }

    // Check if payment is same-day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (payment.processedAt && payment.processedAt < today) {
      throw new BadRequestException('Can only void same-day payments. Use refund instead.');
    }

    // Process void based on payment method
    let voidResult;
    if (payment.paymentMethod === PaymentMethod.CARD) {
      voidResult = await this.gatewayService.voidPayment(payment.id);
    }

    // Update payment status
    await this.prisma.orderPayment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.VOIDED,
        gatewayResponse: {
          ...payment.gatewayResponse as any,
          voidResult,
        },
      },
    });

    // Update order state
    await this.updateOrderPaymentState(payment.orderId, merchantId);

    return payment;
  }
}