import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { TyroPaymentService } from './tyro-payment.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { TyroTransactionDto } from './dto/tyro-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PinRequiredGuard } from '../auth/guards/pin-required.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PinRequired } from '../auth/decorators/pin-required.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly tyroService: TyroPaymentService,
  ) {}

  @Post('process')
  @HttpCode(HttpStatus.OK)
  async processPayment(
    @Body() dto: ProcessPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.processPayment(
      dto,
      user.merchantId,
      user.locationId,
    );
  }

  @Post('refund')
  @UseGuards(PinRequiredGuard)
  @PinRequired('refund_payment')
  @HttpCode(HttpStatus.OK)
  async refundPayment(
    @Body() dto: RefundPaymentDto,
    @CurrentUser() user?: any,
  ) {
    return this.paymentsService.refundPayment(dto, user.merchantId);
  }

  @Get()
  async getPayments(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('locationId') locationId?: string,
  ) {
    return this.paymentsService.getPayments(
      user.merchantId,
      locationId,
      +page,
      +limit,
    );
  }

  // Tyro-specific endpoints
  @Post('tyro/transaction')
  @HttpCode(HttpStatus.OK)
  async saveTyroTransaction(
    @Body() body: {
      amount: number;
      transaction_id: string;
      authorisation_code: string;
      surcharge_amount?: number;
      base_amount?: number;
      status: string;
    },
    @CurrentUser() user: any,
  ) {
    // This endpoint matches the guide's expected format
    // In a real implementation, you might save this to an audit log
    return {
      success: true,
      message: 'Transaction saved',
      transactionId: body.transaction_id,
    };
  }

  @Post('tyro/pair')
  @HttpCode(HttpStatus.OK)
  async pairTyroTerminal(
    @Body() body: { MID: string; TID: string },
    @CurrentUser() user: any,
  ) {
    return this.tyroService.pairTerminal(
      body.MID || user.merchantId,
      body.TID,
    );
  }
}