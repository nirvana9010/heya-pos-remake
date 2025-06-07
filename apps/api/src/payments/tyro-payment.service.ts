import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TyroTransactionDto, TyroTransactionResult } from './dto/tyro-transaction.dto';
import { PaymentMethod, PaymentStatus, RefundStatus } from '../types/payment.types';
import { Decimal } from '@prisma/client/runtime/library';
import { toNumber, toDecimal, addDecimals, subtractDecimals, isGreaterThanOrEqual, isLessThanOrEqual } from '../utils/decimal';

@Injectable()
export class TyroPaymentService {
  private readonly logger = new Logger(TyroPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Process a Tyro payment transaction
   */
  async processPayment(
    invoiceId: string,
    amount: number,
    tyroTransaction: TyroTransactionDto,
    locationId: string,
    merchantId: string,
  ) {
    this.logger.log(`Processing Tyro payment for invoice ${invoiceId}`);

    try {
      // Determine payment status based on Tyro result
      const status = this.getPaymentStatusFromTyroResult(tyroTransaction.result);
      
      // Create payment record
      const payment = await this.prisma.payment.create({
        data: {
          merchantId,
          locationId,
          invoiceId,
          paymentMethod: PaymentMethod.CARD_TYRO,
          amount: toDecimal(tyroTransaction.baseAmount / 100), // Convert from cents
          currency: 'AUD',
          status,
          reference: tyroTransaction.transactionReference,
          tyroTransactionId: tyroTransaction.transactionReference,
          processorResponse: {
            result: tyroTransaction.result,
            authorisationCode: tyroTransaction.authorisationCode,
            surchargeAmount: tyroTransaction.surchargeAmount,
            baseAmount: tyroTransaction.baseAmount,
            terminalId: tyroTransaction.terminalId,
            merchantId: tyroTransaction.merchantId,
          },
          processedAt: status === PaymentStatus.COMPLETED ? new Date() : null,
          failedAt: status === PaymentStatus.FAILED ? new Date() : null,
        },
        include: {
          invoice: true,
        },
      });

      // Update invoice if payment is successful
      if (status === PaymentStatus.COMPLETED) {
        await this.updateInvoicePaymentStatus(invoiceId, payment.amount);
      }

      this.logger.log(`Tyro payment processed successfully: ${payment.id}`);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to process Tyro payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Process a Tyro refund
   */
  async processRefund(
    paymentId: string,
    amount: number,
    reason: string,
    tyroTransaction?: TyroTransactionDto,
  ) {
    this.logger.log(`Processing Tyro refund for payment ${paymentId}`);

    try {
      // Get original payment
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { invoice: true },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.paymentMethod !== PaymentMethod.CARD_TYRO) {
        throw new Error('Payment is not a Tyro payment');
      }

      // Determine refund status
      const status = tyroTransaction 
        ? this.getRefundStatusFromTyroResult(tyroTransaction.result)
        : RefundStatus.PENDING;

      // Create refund record
      const refund = await this.prisma.paymentRefund.create({
        data: {
          paymentId,
          amount: toDecimal(amount),
          reason,
          status,
          reference: tyroTransaction?.transactionReference,
          processedAt: status === RefundStatus.COMPLETED ? new Date() : null,
        },
      });

      // Update payment refunded amount if successful
      if (status === RefundStatus.COMPLETED) {
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            refundedAmount: {
              increment: amount,
            },
            status: isLessThanOrEqual(payment.amount, addDecimals(payment.refundedAmount, amount))
              ? PaymentStatus.REFUNDED 
              : PaymentStatus.PARTIALLY_REFUNDED,
          },
        });

        // Update invoice status
        await this.updateInvoiceRefundStatus(payment.invoiceId, amount);
      }

      this.logger.log(`Tyro refund processed successfully: ${refund.id}`);
      return refund;
    } catch (error) {
      this.logger.error(`Failed to process Tyro refund: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Pair terminal (placeholder for actual implementation)
   */
  async pairTerminal(merchantId: string, terminalId: string) {
    this.logger.log(`Pairing Tyro terminal ${terminalId} for merchant ${merchantId}`);
    
    // In a real implementation, this would interact with Tyro's API
    // For now, we'll just return a success response
    return {
      status: 'success',
      message: 'Terminal paired successfully',
      merchantId,
      terminalId,
      pairedAt: new Date(),
    };
  }

  /**
   * Get payment status from Tyro transaction result
   */
  private getPaymentStatusFromTyroResult(result: TyroTransactionResult): PaymentStatus {
    switch (result) {
      case TyroTransactionResult.APPROVED:
        return PaymentStatus.COMPLETED;
      case TyroTransactionResult.DECLINED:
      case TyroTransactionResult.CANCELLED:
      case TyroTransactionResult.SYSTEM_ERROR:
        return PaymentStatus.FAILED;
      case TyroTransactionResult.REVERSED:
        return PaymentStatus.REFUNDED;
      default:
        return PaymentStatus.FAILED;
    }
  }

  /**
   * Get refund status from Tyro transaction result
   */
  private getRefundStatusFromTyroResult(result: TyroTransactionResult): RefundStatus {
    switch (result) {
      case TyroTransactionResult.APPROVED:
      case TyroTransactionResult.REVERSED:
        return RefundStatus.COMPLETED;
      case TyroTransactionResult.DECLINED:
      case TyroTransactionResult.CANCELLED:
      case TyroTransactionResult.SYSTEM_ERROR:
        return RefundStatus.FAILED;
      default:
        return RefundStatus.FAILED;
    }
  }

  /**
   * Update invoice payment status
   */
  private async updateInvoicePaymentStatus(invoiceId: string, paidAmount: Decimal) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) return;

    const newPaidAmount = addDecimals(invoice.paidAmount, paidAmount);
    const isPaidInFull = isGreaterThanOrEqual(newPaidAmount, invoice.totalAmount);

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: toDecimal(newPaidAmount),
        status: isPaidInFull ? 'PAID' : 'PARTIALLY_PAID',
        paidAt: isPaidInFull ? new Date() : invoice.paidAt,
      },
    });
  }

  /**
   * Update invoice refund status
   */
  private async updateInvoiceRefundStatus(invoiceId: string, refundAmount: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: {
          include: {
            refunds: true,
          },
        },
      },
    });

    if (!invoice) return;

    // Calculate total refunded amount
    const totalRefunded = invoice.payments.reduce((total, payment) => {
      return addDecimals(total, payment.refunds.reduce((sum, refund) => addDecimals(sum, toNumber(refund.amount)), 0));
    }, 0);

    // Update invoice status based on refund amount
    const isFullyRefunded = isGreaterThanOrEqual(totalRefunded, invoice.paidAmount);
    
    if (isFullyRefunded) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'REFUNDED',
        },
      });
    }
  }
}