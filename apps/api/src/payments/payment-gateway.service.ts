import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPaymentGateway, PaymentGatewayConfig, PaymentResult, RefundResult } from '@heya-pos/types';
import { TyroPaymentService } from './tyro-payment.service';

@Injectable()
export class PaymentGatewayService implements IPaymentGateway {
  private gateway: IPaymentGateway | null = null;
  private provider: string = '';

  constructor(
    private configService: ConfigService,
    private tyroService: TyroPaymentService,
  ) {}

  async initialize(config: PaymentGatewayConfig): Promise<void> {
    this.provider = config.provider;
    
    switch (config.provider) {
      case 'TYRO':
        this.gateway = this.tyroService;
        break;
      // Add other payment providers here
      default:
        throw new Error(`Unsupported payment provider: ${config.provider}`);
    }

    await this.gateway.initialize(config);
  }

  async createTerminalPayment(amount: number, orderId: string): Promise<string> {
    if (!this.gateway) {
      throw new Error('Payment gateway not initialized');
    }
    return this.gateway.createTerminalPayment(amount, orderId);
  }

  async getTerminalStatus(referenceId: string): Promise<PaymentResult> {
    if (!this.gateway) {
      throw new Error('Payment gateway not initialized');
    }
    return this.gateway.getTerminalStatus(referenceId);
  }

  async refundPayment(paymentId: string, amount: number, reason?: string): Promise<RefundResult> {
    if (!this.gateway) {
      throw new Error('Payment gateway not initialized');
    }
    return this.gateway.refundPayment(paymentId, amount, reason);
  }

  async voidPayment(paymentId: string): Promise<RefundResult> {
    if (!this.gateway) {
      throw new Error('Payment gateway not initialized');
    }
    return this.gateway.voidPayment(paymentId);
  }

  async isConnected(): Promise<boolean> {
    if (!this.gateway) {
      return false;
    }
    return this.gateway.isConnected();
  }

  getProvider(): string {
    return this.provider;
  }
}