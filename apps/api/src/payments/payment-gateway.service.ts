import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPaymentGateway, PaymentGatewayConfig, PaymentResult, RefundResult } from '@heya-pos/types';
import { TyroPaymentService } from './tyro-payment.service';
import { MockPaymentService } from './mock-payment.service';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class PaymentGatewayService implements IPaymentGateway, OnModuleInit {
  private gateway: IPaymentGateway | null = null;
  private provider: string = '';

  constructor(
    private configService: ConfigService,
    private tyroService: TyroPaymentService,
    private mockService: MockPaymentService,
    private redisService: RedisService,
  ) {}

  async initialize(config: PaymentGatewayConfig): Promise<void> {
    this.provider = config.provider;
    
    switch (config.provider) {
      case 'TYRO':
        this.gateway = this.tyroService;
        break;
      case 'MOCK':
        this.gateway = this.mockService;
        break;
      // Add other payment providers here
      default:
        throw new Error(`Unsupported payment provider: ${config.provider}`);
    }

    await this.gateway.initialize(config);
  }

  async onModuleInit() {
    // Auto-initialize payment gateway on startup
    const provider = this.configService.get<string>('PAYMENT_PROVIDER', 'MOCK') as 'TYRO' | 'STRIPE' | 'SQUARE' | 'MOCK';
    const merchantId = this.configService.get<string>('PAYMENT_MERCHANT_ID', 'mock-merchant');
    
    console.log('[PaymentGatewayService] Initializing payment gateway on startup:', {
      provider,
      merchantId,
      nodeEnv: process.env.NODE_ENV,
    });

    try {
      await this.initialize({
        provider,
        merchantId,
        apiKey: this.configService.get<string>('PAYMENT_API_KEY', ''),
        secretKey: this.configService.get<string>('PAYMENT_SECRET_KEY', ''),
        webhookSecret: this.configService.get<string>('PAYMENT_WEBHOOK_SECRET', ''),
        environment: this.configService.get<string>('NODE_ENV', 'development') === 'production' ? 'production' : 'sandbox',
      });
      
      console.log('[PaymentGatewayService] Payment gateway initialized successfully');
    } catch (error) {
      console.error('[PaymentGatewayService] Failed to initialize payment gateway:', error);
      
      // In development, fallback to mock provider
      if (process.env.NODE_ENV !== 'production' && provider !== 'MOCK') {
        console.log('[PaymentGatewayService] Falling back to MOCK provider for development');
        await this.initialize({
          provider: 'MOCK',
          merchantId: 'mock-merchant',
          apiKey: '',
          secretKey: '',
          webhookSecret: '',
          environment: 'sandbox',
        });
      }
    }
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

  async getGatewayConfig(merchantId: string): Promise<{ provider: string; config: any }> {
    // Cache payment gateway config for 5 minutes
    const cacheKey = `payment-gateway:${merchantId}`;
    const cached = await this.redisService.get<{ provider: string; config: any }>(cacheKey);
    
    if (cached && cached.provider && cached.config) {
      return cached;
    }
    
    const config = {
      provider: this.provider,
      config: {
        merchantId,
        connected: await this.isConnected(),
      },
    };
    
    // Cache for 5 minutes
    await this.redisService.set(cacheKey, config, 300);
    
    return config;
  }
}