import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PinRequiredGuard } from '../auth/guards/pin-required.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PinRequired } from '../auth/decorators/pin-required.decorator';
import {
  ProcessPaymentDto,
  SplitPaymentDto,
  OrderModifierDto,
  OrderState,
} from '@heya-pos/types';
import { BadRequestException } from '@nestjs/common';

// @ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
// @ApiBearerAuth()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('process')
  @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Process a payment for an order' })
  async processPayment(@Body() dto: ProcessPaymentDto, @CurrentUser() user: any) {
    // For merchant users, we need to find a staff member to process the payment
    let staffId = user.id;
    
    if (user.type === 'merchant' || user.role === 'MERCHANT') {
      // Get any active staff member for this merchant
      const staff = await this.prisma.staff.findFirst({
        where: { 
          merchantId: user.merchantId,
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'asc' }
      });
      
      if (!staff) {
        throw new BadRequestException('No active staff found to process payment');
      }
      
      staffId = staff.id;
    }
    
    return this.paymentsService.processPayment(
      dto,
      user.merchantId,
      staffId,
    );
  }

  @Post('split')
  @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Process split payments for an order' })
  async processSplitPayment(@Body() dto: SplitPaymentDto, @CurrentUser() user: any) {
    return this.paymentsService.processSplitPayment(
      dto,
      user.merchantId,
      user.id,
    );
  }

  @Post('refund')
  @UseGuards(PinRequiredGuard)
  @PinRequired('refund_payment')
  @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Refund a payment' })
  async refundPayment(
    @Body() dto: { paymentId: string; amount: number; reason: string },
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.refundPayment(
      dto.paymentId,
      dto.amount,
      dto.reason,
      user.merchantId,
    );
  }

  @Post('void/:paymentId')
  @UseGuards(PinRequiredGuard)
  @PinRequired('void_payment')
  @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Void a payment (same-day only)' })
  async voidPayment(@Param('paymentId') paymentId: string, @CurrentUser() user: any) {
    return this.paymentsService.voidPayment(paymentId, user.merchantId);
  }

  // Order endpoints
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  // @ApiOperation({ summary: 'Create a new order' })
  async createOrder(
    @Body() dto: { customerId?: string; bookingId?: string },
    @CurrentUser() user: any,
  ) {
    let createdById: string;
    
    // If user is staff, use their ID
    if (user.type === 'staff' && user.staffId) {
      createdById = user.staffId;
    } else {
      // For merchant users, find the first active staff member
      const firstStaff = await this.prisma.staff.findFirst({
        where: {
          merchantId: user.merchantId,
          status: 'ACTIVE',
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      
      if (!firstStaff) {
        throw new BadRequestException('No active staff members found. Please create a staff member first.');
      }
      
      createdById = firstStaff.id;
    }
    
    // Ensure locationId is available - create default location if needed
    console.log('[Order Creation] User data:', {
      merchantId: user.merchantId,
      currentLocationId: user.currentLocationId,
      merchantLocations: user.merchant?.locations,
      merchantName: user.merchant?.name
    });
    
    let locationId = user.currentLocationId || user.merchant?.locations?.[0]?.id;
    
    if (!locationId) {
      console.warn(`[Order Creation] Merchant ${user.merchantId} has no locations. Creating default location.`);
      
      // Create a default location for this merchant
      const defaultLocation = await this.prisma.location.create({
        data: {
          merchantId: user.merchantId,
          name: `${user.merchant?.name || 'Main'} Location`,
          address: '123 Main Street',
          suburb: 'Default Suburb',
          city: 'Default City',
          country: 'Australia',
          isActive: true,
          businessHours: {
            monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            sunday: { isOpen: false, openTime: '09:00', closeTime: '17:00' }
          },
          settings: {}
        }
      });
      
      locationId = defaultLocation.id;
      console.log(`Created default location ${locationId} for merchant ${user.merchantId}`);
    }

    // Handle walk-in customer - convert WALK_IN to null for orders
    let customerId = dto.customerId;
    if (customerId === 'WALK_IN') {
      // For orders, we can have null customerId
      customerId = undefined;
    }
    
    return this.ordersService.createOrder({
      merchantId: user.merchantId,
      locationId,
      customerId,
      bookingId: dto.bookingId,
      createdById,
    });
  }

  @Get('orders/:orderId')
  // @ApiOperation({ summary: 'Get order details' })
  async getOrder(@Param('orderId') orderId: string, @CurrentUser() user: any) {
    return this.ordersService.findOrder(orderId, user.merchantId);
  }

  @Post('orders/:orderId/items')
  @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Add items to an order' })
  async addOrderItems(
    @Param('orderId') orderId: string,
    @Body() dto: { items: any[] },
    @CurrentUser() user: any,
  ) {
    return this.ordersService.addOrderItems(
      orderId,
      user.merchantId,
      dto.items,
    );
  }

  @Post('orders/:orderId/modifiers')
  @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Add discount or surcharge to an order' })
  async addOrderModifier(
    @Param('orderId') orderId: string,
    @Body() dto: OrderModifierDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.addOrderModifier(
      orderId,
      user.merchantId,
      dto,
    );
  }

  @Post('orders/:orderId/state')
  @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Update order state' })
  async updateOrderState(
    @Param('orderId') orderId: string,
    @Body() dto: { state: OrderState },
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateOrderState(
      orderId,
      user.merchantId,
      dto.state,
    );
  }

  @Post('orders/from-booking/:bookingId')
  @HttpCode(HttpStatus.CREATED)
  // @ApiOperation({ summary: 'Create order from booking' })
  async createOrderFromBooking(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: any,
  ) {
    // For merchant users, staffId will be null and the service will find an appropriate staff
    const staffId = user.type === 'staff' ? user.id : null;
    
    return this.ordersService.createOrderFromBooking(
      bookingId,
      user.merchantId,
      staffId,
    );
  }

  // Legacy endpoints for backwards compatibility
  @Get()
  async getPayments(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('locationId') locationId?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { 
      order: { merchantId: user.merchantId }
    };
    if (locationId) {
      where.order.locationId = locationId;
    }

    const [payments, total] = await Promise.all([
      this.prisma.orderPayment.findMany({
        where,
        include: {
          order: {
            include: {
              customer: true,
              items: true,
              modifiers: true,
              booking: {
                include: {
                  services: {
                    include: {
                      service: true,
                    },
                  },
                },
              },
            },
          },
          tipAllocations: {
            include: {
              staff: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.orderPayment.count({ where }),
    ]);

    // Enrich order items with service data
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        if (payment.order?.items?.length > 0) {
          // Get service IDs from items where itemType is SERVICE
          const serviceIds = payment.order.items
            .filter((item: any) => item.itemType === 'SERVICE')
            .map((item: any) => item.itemId);
          
          if (serviceIds.length > 0) {
            // Fetch service details
            const services = await this.prisma.service.findMany({
              where: { id: { in: serviceIds } },
              select: { id: true, name: true, price: true },
            });
            
            // Create a map for quick lookup
            const serviceMap = new Map(services.map(s => [s.id, s]));
            
            // Enrich items with service data
            payment.order.items = payment.order.items.map((item: any) => {
              if (item.itemType === 'SERVICE' && serviceMap.has(item.itemId)) {
                const service = serviceMap.get(item.itemId);
                return {
                  ...item,
                  service: service,
                  name: item.description || service?.name,
                };
              }
              return item;
            });
          }
        }
        return payment;
      })
    );

    return {
      payments: enrichedPayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

}