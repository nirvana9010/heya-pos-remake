import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TyroPaymentService } from './tyro-payment.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tyroService: TyroPaymentService,
  ) {}

  /**
   * Process a payment for an invoice
   */
  async processPayment(dto: ProcessPaymentDto, merchantId: string, locationId: string) {
    // Verify invoice exists and belongs to merchant
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: dto.invoiceId,
        merchantId,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check if payment amount is valid
    const remainingAmount = invoice.totalAmount - invoice.paidAmount;
    if (dto.amount > remainingAmount) {
      throw new BadRequestException('Payment amount exceeds remaining balance');
    }

    // Process based on payment method
    switch (dto.method) {
      case PaymentMethod.CARD_TYRO:
        return this.processTyroPayment(dto, merchantId, locationId);
      
      case PaymentMethod.CASH:
        return this.processCashPayment(dto, merchantId, locationId);
      
      case PaymentMethod.CARD_STRIPE:
        return this.processStripePayment(dto, merchantId, locationId);
      
      default:
        return this.processGenericPayment(dto, merchantId, locationId);
    }
  }

  /**
   * Process Tyro card payment
   */
  private async processTyroPayment(dto: ProcessPaymentDto, merchantId: string, locationId: string) {
    if (!dto.tyroTransactionReference) {
      throw new BadRequestException('Tyro transaction reference is required');
    }

    const tyroTransaction = {
      amount: dto.amount * 100, // Convert to cents
      transactionReference: dto.tyroTransactionReference,
      authorisationCode: dto.tyroAuthorisationCode || '',
      surchargeAmount: dto.tyroDasurchargeAmount || 0,
      baseAmount: dto.tyroBaseAmount || dto.amount * 100,
      result: 'APPROVED' as any, // This would come from the frontend
    };

    return this.tyroService.processPayment(
      dto.invoiceId,
      dto.amount,
      tyroTransaction,
      locationId,
      merchantId,
    );
  }

  /**
   * Process cash payment
   */
  private async processCashPayment(dto: ProcessPaymentDto, merchantId: string, locationId: string) {
    const changeAmount = (dto.cashReceived || dto.amount) - dto.amount;

    const payment = await this.prisma.payment.create({
      data: {
        merchantId,
        locationId,
        invoiceId: dto.invoiceId,
        paymentMethod: PaymentMethod.CASH,
        amount: dto.amount,
        currency: 'AUD',
        status: PaymentStatus.COMPLETED,
        reference: dto.reference,
        notes: dto.notes,
        processedAt: new Date(),
        processorResponse: {
          cashReceived: dto.cashReceived,
          changeAmount,
        },
      },
      include: {
        invoice: true,
      },
    });

    // Update invoice
    await this.updateInvoicePaymentStatus(dto.invoiceId, dto.amount);

    return {
      payment,
      changeAmount: changeAmount > 0 ? changeAmount : 0,
    };
  }

  /**
   * Process Stripe payment (placeholder)
   */
  private async processStripePayment(dto: ProcessPaymentDto, merchantId: string, locationId: string) {
    // This would integrate with Stripe API
    const payment = await this.prisma.payment.create({
      data: {
        merchantId,
        locationId,
        invoiceId: dto.invoiceId,
        paymentMethod: PaymentMethod.CARD_STRIPE,
        amount: dto.amount,
        currency: 'AUD',
        status: PaymentStatus.PENDING,
        reference: dto.reference,
        stripePaymentIntentId: dto.stripePaymentMethodId,
        notes: dto.notes,
      },
      include: {
        invoice: true,
      },
    });

    return { payment };
  }

  /**
   * Process generic payment method
   */
  private async processGenericPayment(dto: ProcessPaymentDto, merchantId: string, locationId: string) {
    const payment = await this.prisma.payment.create({
      data: {
        merchantId,
        locationId,
        invoiceId: dto.invoiceId,
        paymentMethod: dto.method,
        amount: dto.amount,
        currency: 'AUD',
        status: PaymentStatus.COMPLETED,
        reference: dto.reference,
        notes: dto.notes,
        processedAt: new Date(),
      },
      include: {
        invoice: true,
      },
    });

    await this.updateInvoicePaymentStatus(dto.invoiceId, dto.amount);
    return { payment };
  }

  /**
   * Process payment refund
   */
  async refundPayment(dto: RefundPaymentDto, merchantId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: dto.paymentId,
        merchantId,
      },
      include: {
        refunds: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Check refund amount
    const totalRefunded = payment.refunds.reduce((sum, refund) => sum + refund.amount, 0);
    const maxRefundable = payment.amount - totalRefunded;

    if (dto.amount > maxRefundable) {
      throw new BadRequestException('Refund amount exceeds refundable balance');
    }

    // Process based on payment method
    if (payment.paymentMethod === PaymentMethod.CARD_TYRO) {
      return this.tyroService.processRefund(payment.id, dto.amount, dto.reason);
    }

    // Generic refund for other methods
    return this.processGenericRefund(payment.id, dto.amount, dto.reason);
  }

  /**
   * Process generic refund
   */
  private async processGenericRefund(paymentId: string, amount: number, reason: string) {
    const refund = await this.prisma.paymentRefund.create({
      data: {
        paymentId,
        amount,
        reason,
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    });

    // Update payment
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        refundedAmount: {
          increment: amount,
        },
      },
    });

    return refund;
  }

  /**
   * Get payments for a merchant
   */
  async getPayments(
    merchantId: string,
    locationId?: string,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { merchantId };
    if (locationId) {
      where.locationId = locationId;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          invoice: {
            include: {
              customer: true,
            },
          },
          refunds: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update invoice payment status
   */
  private async updateInvoicePaymentStatus(invoiceId: string, paidAmount: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) return;

    const newPaidAmount = invoice.paidAmount + paidAmount;
    const isPaidInFull = newPaidAmount >= invoice.totalAmount;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        status: isPaidInFull ? 'PAID' : 'PARTIALLY_PAID',
        paidAt: isPaidInFull ? new Date() : invoice.paidAt,
      },
    });
  }
}