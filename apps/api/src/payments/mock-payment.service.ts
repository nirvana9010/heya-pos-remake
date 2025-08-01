import { Injectable } from '@nestjs/common';
import { IPaymentGateway, PaymentGatewayConfig, PaymentResult, RefundResult, PaymentMethod } from '@heya-pos/types';

@Injectable()
export class MockPaymentService implements IPaymentGateway {
  private isInitialized = false;
  private config: PaymentGatewayConfig | null = null;
  
  async isConnected(): Promise<boolean> {
    return this.isInitialized;
  }

  async initialize(config: PaymentGatewayConfig): Promise<void> {
    console.log('[MockPaymentService] Initializing with config:', {
      provider: config.provider,
      merchantId: config.merchantId,
    });
    this.config = config;
    this.isInitialized = true;
  }

  async createTerminalPayment(amount: number, orderId: string): Promise<string> {
    this.ensureInitialized();
    
    // Generate a mock reference ID
    const referenceId = `MOCK_${Date.now()}_${orderId.substring(0, 8)}`;
    console.log('[MockPaymentService] Creating terminal payment:', {
      amount,
      orderId,
      referenceId,
    });
    
    return referenceId;
  }

  async getTerminalStatus(referenceId: string): Promise<PaymentResult> {
    this.ensureInitialized();
    
    console.log('[MockPaymentService] Getting terminal status for:', referenceId);
    
    // No delay for development - instant response
    
    // Simulate different outcomes based on reference patterns
    if (referenceId.includes('FAIL')) {
      return {
        success: false,
        transactionId: referenceId,
        amount: 0,
        method: PaymentMethod.CARD,
        error: 'Simulated payment failure',
        gatewayResponse: {
          status: 'FAILED',
          message: 'Card declined (mock)',
          timestamp: new Date().toISOString(),
        },
      };
    }
    
    // Default to success - for mock, we'll use a default amount
    // In real implementation, this would be tracked with the terminal payment
    return {
      success: true,
      transactionId: `TXN_${referenceId}`,
      amount: 100, // Default amount for testing
      method: PaymentMethod.CARD,
      gatewayResponse: {
        status: 'APPROVED',
        authCode: 'MOCK123',
        timestamp: new Date().toISOString(),
        cardType: 'VISA',
        last4: '4242',
      },
    };
  }

  async refundPayment(paymentId: string, amount: number, reason?: string): Promise<RefundResult> {
    this.ensureInitialized();
    
    console.log('[MockPaymentService] Processing refund:', {
      paymentId,
      amount,
      reason,
    });
    
    // No delay for development - instant response
    
    return {
      success: true,
      refundId: `REFUND_${Date.now()}_${paymentId.substring(0, 8)}`,
      amount: amount,
    };
  }

  async voidPayment(paymentId: string): Promise<RefundResult> {
    this.ensureInitialized();
    
    console.log('[MockPaymentService] Voiding payment:', paymentId);
    
    // No delay for development - instant response
    
    return {
      success: true,
      refundId: `VOID_${Date.now()}_${paymentId.substring(0, 8)}`,
      amount: 0, // Void typically refunds the full amount
    };
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('MockPaymentService not initialized');
    }
  }
}