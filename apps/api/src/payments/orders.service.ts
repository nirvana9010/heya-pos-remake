import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderState, OrderModifierType, OrderModifierCalculation } from '@heya-pos/types';
import { Decimal } from '@prisma/client/runtime/library';
import { RedisService } from '../common/redis/redis.service';
import { Order, Customer, Booking, OrderItem, OrderPayment } from '@prisma/client';
import { PrepareOrderDto } from './dto/prepare-order.dto';
import { PaymentInitResponseDto } from './dto/payment-init.dto';
import { PaymentGatewayService } from './payment-gateway.service';

type OrderWithRelations = Order & {
  customer?: Customer | null;
  booking?: Booking | null;
  items: OrderItem[];
  payments: OrderPayment[];
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private paymentGatewayService: PaymentGatewayService,
  ) {}

  async createOrder(data: {
    merchantId: string;
    locationId: string;
    customerId?: string;
    bookingId?: string;
    createdById: string;
  }) {
    // Handle special walk-in customer ID
    let finalCustomerId = data.customerId;
    if (data.customerId === 'WALK_IN') {
      // For orders, we can use null customerId for walk-in
      finalCustomerId = undefined;
    }
    
    // Generate unique order number
    const orderNumber = await this.generateOrderNumber(data.merchantId);

    return this.prisma.order.create({
      data: {
        ...data,
        customerId: finalCustomerId,
        orderNumber,
        state: OrderState.DRAFT,
        subtotal: new Decimal(0),
        taxAmount: new Decimal(0),
        totalAmount: new Decimal(0),
        balanceDue: new Decimal(0),
      },
      include: {
        items: true,
        modifiers: true,
        payments: true,
        customer: true,
        booking: true,
      },
    });
  }

  async findOrderForPayment(orderId: string, merchantId: string): Promise<OrderWithRelations> {
    // Try to get from cache first
    const cacheKey = RedisService.getOrderCacheKey(orderId);
    const cachedOrder = await this.redisService.get(cacheKey);
    
    if (cachedOrder) {
      // Validate merchant ID matches
      if (cachedOrder['merchantId'] === merchantId) {
        return cachedOrder as OrderWithRelations;
      }
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, merchantId },
      include: {
        items: true, // Only basic item info, no staff details
        payments: true, // Only payment info, no tip allocations
        customer: true, // Include customer for payment display
        booking: true, // Include booking for payment display
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Cache the order for 5 minutes
    await this.redisService.set(cacheKey, order, 300);

    return order;
  }

  async findOrder(orderId: string, merchantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, merchantId },
      include: {
        items: {
          include: {
            staff: true,
          },
        },
        modifiers: true,
        payments: {
          include: {
            tipAllocations: {
              include: {
                staff: true,
              },
            },
          },
        },
        customer: true,
        booking: {
          include: {
            services: {
              include: {
                service: true,
                staff: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderState(orderId: string, merchantId: string, newState: OrderState) {
    const order = await this.findOrder(orderId, merchantId);
    
    // Validate state transition
    this.validateStateTransition(order.state as OrderState, newState);

    const updateData: any = { state: newState };

    // Set timestamps based on state changes
    if (newState === OrderState.LOCKED) {
      updateData.lockedAt = new Date();
    } else if (newState === OrderState.COMPLETE) {
      updateData.completedAt = new Date();
    } else if (newState === OrderState.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: true,
        modifiers: true,
        payments: true,
      },
    });

    // Invalidate cache
    await this.redisService.del(RedisService.getOrderCacheKey(orderId));
    if (order.bookingId) {
      await this.redisService.del(RedisService.getOrderByBookingCacheKey(order.bookingId));
    }

    return updatedOrder;
  }

  async addOrderItems(orderId: string, merchantId: string, items: any[]) {
    const order = await this.findOrder(orderId, merchantId);

    if (order.state !== OrderState.DRAFT) {
      throw new BadRequestException('Cannot modify items on a locked order');
    }

    // Add items
    const createdItems = await Promise.all(
      items.map((item, index) =>
        this.prisma.orderItem.create({
          data: {
            orderId,
            itemType: item.itemType,
            itemId: item.itemId,
            description: item.description,
            quantity: new Decimal(item.quantity),
            unitPrice: new Decimal(item.unitPrice),
            discount: new Decimal(item.discount || 0),
            taxRate: new Decimal(item.taxRate || 0.0),
            taxAmount: new Decimal(0), // Will be calculated
            total: new Decimal(0), // Will be calculated
            staffId: item.staffId,
            metadata: item.metadata,
            sortOrder: index,
          },
        })
      )
    );

    // Recalculate order totals
    await this.recalculateOrderTotals(orderId);

    // Invalidate cache
    await this.redisService.del(RedisService.getOrderCacheKey(orderId));
    if (order.bookingId) {
      await this.redisService.del(RedisService.getOrderByBookingCacheKey(order.bookingId));
    }

    return this.findOrder(orderId, merchantId);
  }

  async addOrderModifier(
    orderId: string,
    merchantId: string,
    modifier: {
      type: OrderModifierType;
      subtype?: string;
      calculation: OrderModifierCalculation;
      value: number;
      description: string;
      appliesTo?: string[];
    }
  ) {
    const order = await this.findOrder(orderId, merchantId);

    if (order.state !== OrderState.DRAFT && 
        order.state !== OrderState.LOCKED && 
        order.state !== OrderState.PENDING_PAYMENT) {
      throw new BadRequestException('Cannot modify a paid order');
    }

    await this.prisma.orderModifier.create({
      data: {
        orderId,
        type: modifier.type,
        subtype: modifier.subtype,
        calculation: modifier.calculation,
        value: new Decimal(modifier.value),
        amount: new Decimal(0), // Will be calculated
        description: modifier.description,
        appliesTo: modifier.appliesTo,
      },
    });

    await this.recalculateOrderTotals(orderId);

    return this.findOrder(orderId, merchantId);
  }

  async recalculateOrderTotals(orderId: string) {
    const startTime = Date.now();
    
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        modifiers: true,
        payments: {
          where: { status: 'COMPLETED' },
        },
      },
    });

    if (!order) return;

    // Calculate item totals and prepare batch updates
    let subtotal = new Decimal(0);
    let taxAmount = new Decimal(0);
    const itemUpdates = [];

    for (const item of order.items) {
      // Convert to Decimal if needed
      const quantity = new Decimal(item.quantity);
      const unitPrice = new Decimal(item.unitPrice);
      const discount = new Decimal(item.discount || 0);
      const taxRate = new Decimal(item.taxRate || 0);

      const itemSubtotal = quantity.mul(unitPrice).sub(discount);
      const itemTax = itemSubtotal.mul(taxRate);
      const itemTotal = itemSubtotal.add(itemTax);

      // Prepare update for batch execution
      itemUpdates.push(
        this.prisma.orderItem.update({
          where: { id: item.id },
          data: {
            taxAmount: itemTax,
            total: itemTotal,
          },
        })
      );

      subtotal = subtotal.add(itemSubtotal);
      taxAmount = taxAmount.add(itemTax);
    }

    // Apply modifiers and prepare batch updates
    let totalAmount = subtotal.add(taxAmount);
    const modifierUpdates = [];
    
    for (const modifier of order.modifiers) {
      let modifierAmount = new Decimal(0);
      const modifierValue = new Decimal(modifier.value);

      if (modifier.calculation === OrderModifierCalculation.PERCENTAGE) {
        modifierAmount = subtotal.mul(modifierValue.div(100));
      } else {
        modifierAmount = modifierValue;
      }

      if (modifier.type === OrderModifierType.DISCOUNT) {
        modifierAmount = modifierAmount.neg();
      }

      // Prepare update for batch execution
      modifierUpdates.push(
        this.prisma.orderModifier.update({
          where: { id: modifier.id },
          data: { amount: modifierAmount },
        })
      );

      totalAmount = totalAmount.add(modifierAmount);
    }

    // Calculate paid amount and balance due
    const paidAmount = order.payments.reduce(
      (sum, payment) => sum.add(new Decimal(payment.amount)),
      new Decimal(0)
    );

    const balanceDue = totalAmount.sub(paidAmount);

    // Execute all updates in parallel
    const allUpdates = [
      ...itemUpdates,
      ...modifierUpdates,
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          subtotal,
          taxAmount,
          totalAmount,
          paidAmount,
          balanceDue,
        },
      })
    ];

    await Promise.all(allUpdates);
    
    console.log(`[RecalculateTotals] Completed in ${Date.now() - startTime}ms for order ${orderId}`);
  }

  private validateStateTransition(currentState: OrderState, newState: OrderState) {
    const validTransitions: Record<OrderState, OrderState[]> = {
      [OrderState.DRAFT]: [OrderState.LOCKED, OrderState.CANCELLED],
      [OrderState.LOCKED]: [OrderState.PENDING_PAYMENT, OrderState.CANCELLED],
      [OrderState.PENDING_PAYMENT]: [OrderState.PARTIALLY_PAID, OrderState.PAID, OrderState.CANCELLED],
      [OrderState.PARTIALLY_PAID]: [OrderState.PAID, OrderState.CANCELLED],
      [OrderState.PAID]: [OrderState.COMPLETE, OrderState.REFUNDED],
      [OrderState.COMPLETE]: [OrderState.REFUNDED],
      [OrderState.CANCELLED]: [],
      [OrderState.REFUNDED]: [],
    };

    const allowedStates = validTransitions[currentState] || [];
    if (!allowedStates.includes(newState)) {
      throw new BadRequestException(
        `Invalid state transition from ${currentState} to ${newState}`
      );
    }
  }

  private async generateOrderNumber(merchantId: string, retryCount: number = 0): Promise<string> {
    // Prevent infinite loops
    if (retryCount > 10) {
      throw new Error('Unable to generate unique order number after 10 attempts');
    }

    // Get the current date
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const datePrefix = `OR-${year}${month}${day}`;

    console.log(`[generateOrderNumber] Generating for prefix: ${datePrefix}, retry: ${retryCount}`);

    // Find the highest sequence number for this date prefix
    // This handles cases where orders might exist from different timezone contexts
    const lastOrder = await this.prisma.order.findFirst({
      where: {
        merchantId,
        orderNumber: {
          startsWith: datePrefix,
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
      select: {
        orderNumber: true,
      },
    });

    let sequenceNumber = 1;
    if (lastOrder) {
      // Extract the sequence number from the last order
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2] || '0', 10);
      sequenceNumber = lastSequence + 1;
      console.log(`[generateOrderNumber] Last order: ${lastOrder.orderNumber}, next sequence: ${sequenceNumber}`);
    }

    // Add retry count to sequence number if retrying
    sequenceNumber += retryCount;

    // Generate order number: OR-YYMMDD-XXXX
    const orderNumber = `${datePrefix}-${sequenceNumber.toString().padStart(4, '0')}`;
    console.log(`[generateOrderNumber] Trying order number: ${orderNumber}`);

    // Double-check for uniqueness (in case of race conditions)
    const existingOrder = await this.prisma.order.findUnique({
      where: { orderNumber },
    });

    if (existingOrder) {
      console.log(`[generateOrderNumber] Order number ${orderNumber} already exists, retrying...`);
      // If there's a collision, try the next number
      return this.generateOrderNumber(merchantId, retryCount + 1);
    }

    return orderNumber;
  }

  async createOrderFromBooking(bookingId: string, merchantId: string, staffId: string) {
    console.log(`[PERF] createOrderFromBooking - start`);
    const bookingStart = Date.now();
    
    // Check cache first for existing order
    const bookingCacheKey = RedisService.getOrderByBookingCacheKey(bookingId);
    const cachedOrderId = await this.redisService.get<string>(bookingCacheKey);
    
    if (cachedOrderId) {
      console.log(`[PERF] Found cached order ID in ${Date.now() - bookingStart}ms`);
      // Verify the order still exists and return it
      try {
        const cachedOrder = await this.findOrderForPayment(cachedOrderId, merchantId);
        console.log(`[PERF] Total createOrderFromBooking took ${Date.now() - bookingStart}ms (cached)`);
        return cachedOrder;
      } catch (e) {
        // Order doesn't exist anymore, continue with creation
        await this.redisService.del(bookingCacheKey);
      }
    }
    
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, merchantId },
      include: {
        services: {
          include: {
            service: true,
            staff: true,
          },
        },
        customer: true,
      },
    });
    console.log(`[PERF] Booking query took ${Date.now() - bookingStart}ms`);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    
    // If no staffId provided (merchant user), use the first available staff or booking's staff
    let actualStaffId = staffId;
    if (!actualStaffId) {
      // Try to use the staff from the booking
      if (booking.services.length > 0 && booking.services[0].staffId) {
        actualStaffId = booking.services[0].staffId;
      } else {
        // Get any active staff member for this merchant
        const defaultStaff = await this.prisma.staff.findFirst({
          where: { 
            merchantId,
            status: 'ACTIVE'
          },
          orderBy: { createdAt: 'asc' }
        });
        
        if (!defaultStaff) {
          throw new BadRequestException('No active staff found to create order');
        }
        
        actualStaffId = defaultStaff.id;
      }
    }

    // Check if order already exists for this booking (only DB check since cache was already checked above)
    const orderCheckStart = Date.now();
    const existingOrderCheck = await this.prisma.order.findFirst({
      where: { bookingId },
      select: { id: true }, // Only select ID for quick check
    });
    console.log(`[PERF] Order existence check (DB) took ${Date.now() - orderCheckStart}ms`);

    if (existingOrderCheck) {
      console.log('[OrdersService] Order already exists for booking:', bookingId);
      
      // Check if order has items using a lightweight query
      const itemCheckStart = Date.now();
      const itemCount = await this.prisma.orderItem.count({
        where: { orderId: existingOrderCheck.id }
      });
      console.log(`[PERF] Item count check took ${Date.now() - itemCheckStart}ms`);

      // If no items and order is in DRAFT, add them
      if (itemCount === 0) {
        const orderStateCheck = await this.prisma.order.findUnique({
          where: { id: existingOrderCheck.id },
          select: { state: true }
        });
        
        if (orderStateCheck?.state === 'DRAFT') {
          // Add booking services as order items
          const items = booking.services.map(bs => ({
            itemType: 'SERVICE',
            itemId: bs.serviceId,
            description: bs.service.name,
            quantity: 1,
            unitPrice: typeof bs.price === 'object' && bs.price.toNumber ? bs.price.toNumber() : Number(bs.price),
            staffId: bs.staffId,
            metadata: {
              bookingServiceId: bs.id,
              duration: bs.duration,
            },
          }));

          const addItemsStart = Date.now();
          await this.addOrderItems(existingOrderCheck.id, merchantId, items);
          console.log(`[PERF] Add items took ${Date.now() - addItemsStart}ms`);
        }
      }
      
      // Return order with minimal includes for payment
      const findOrderStart = Date.now();
      const result = await this.findOrderForPayment(existingOrderCheck.id, merchantId);
      console.log(`[PERF] Find order for payment took ${Date.now() - findOrderStart}ms`);
      console.log(`[PERF] Total createOrderFromBooking took ${Date.now() - bookingStart}ms`);
      return result;
    }

    // Create new order
    const order = await this.createOrder({
      merchantId,
      locationId: booking.locationId,
      customerId: booking.customerId,
      bookingId: booking.id,
      createdById: actualStaffId,
    });

    // Add booking services as order items
    const items = booking.services.map(bs => ({
      itemType: 'SERVICE',
      itemId: bs.serviceId,
      description: bs.service.name,
      quantity: 1,
      unitPrice: typeof bs.price === 'object' && bs.price.toNumber ? bs.price.toNumber() : Number(bs.price),
      staffId: bs.staffId,
      metadata: {
        bookingServiceId: bs.id,
        duration: bs.duration,
      },
    }));

    await this.addOrderItems(order.id, merchantId, items);

    // Cache the booking-order relationship
    const newBookingCacheKey = RedisService.getOrderByBookingCacheKey(bookingId);
    await this.redisService.set(newBookingCacheKey, order.id, 300); // 5 minutes

    // Use lightweight query for new orders too
    const result = await this.findOrderForPayment(order.id, merchantId);
    console.log(`[PERF] Total createOrderFromBooking took ${Date.now() - bookingStart}ms (new order)`);
    return result;
  }

  async prepareOrderForPayment(dto: PrepareOrderDto, user: any): Promise<PaymentInitResponseDto> {
    const startTime = Date.now();
    
    try {
      // Pre-fetch ALL data that doesn't need to be in transaction for better performance
      let createdById: string | undefined;
      let orderNumber: string | undefined;
      let paymentGateway: any;
      let merchant: any;
      let location: any;
      
      // Start parallel fetches for non-transactional data
      const parallelFetches = [];
      
      // 1. Payment gateway fetch (always needed)
      parallelFetches.push(
        this.paymentGatewayService.getGatewayConfig(user.merchantId)
          .then(config => { paymentGateway = config; })
          .catch(err => {
            console.error('[PrepareOrder] Failed to fetch payment gateway:', err);
            paymentGateway = { provider: 'stripe', config: {} }; // Fallback
          })
      );
      
      // 2. Merchant info fetch (always needed)
      parallelFetches.push(
        this.prisma.merchant.findUnique({
          where: { id: user.merchantId },
          select: {
            id: true,
            name: true,
            settings: true,
          },
        }).then(m => { merchant = m; })
      );
      
      // 3. Location info fetch (if available)
      if (user.locationId) {
        parallelFetches.push(
          this.prisma.location.findUnique({
            where: { id: user.locationId },
            select: {
              id: true,
              name: true,
              settings: true,
            },
          }).then(l => { location = l; })
        );
      }
      
      // 4. Staff ID and order number for new orders (or orders from bookings)
      if (!dto.orderId) {
        // Get staff ID
        if (user.type === 'staff' && user.staffId) {
          createdById = user.staffId;
        } else {
          parallelFetches.push(
            this.prisma.staff.findFirst({
              where: {
                merchantId: user.merchantId,
                status: 'ACTIVE',
              },
              orderBy: {
                createdAt: 'asc',
              },
            }).then(firstStaff => {
              if (!firstStaff) {
                throw new BadRequestException('No active staff members found. Please create a staff member first.');
              }
              createdById = firstStaff.id;
            })
          );
        }
        
        // Generate order number in parallel (only if not checking for existing booking order)
        if (!dto.bookingId) {
          parallelFetches.push(
            this.generateOrderNumber(user.merchantId)
              .then(num => { orderNumber = num; })
          );
        }
      }
      
      // Execute all parallel fetches
      await Promise.all(parallelFetches);
      
      console.log(`[PrepareOrder] Pre-fetch completed in ${Date.now() - startTime}ms`);
      
      // IMPORTANT: With connection_limit=1, we avoid large transactions
      // Execute operations sequentially to prevent connection pool exhaustion
      let order: OrderWithRelations;
      
      // Step 1: Get or create order (NO TRANSACTION for reads)
      if (dto.orderId) {
        // Existing order by ID
        order = await this.prisma.order.findFirst({
          where: { id: dto.orderId, merchantId: user.merchantId },
          include: {
            items: true,
            payments: true,
            customer: true,
            booking: true,
          },
        });
        
        if (!order) {
          throw new NotFoundException('Order not found');
        }
        
        if (order.state !== OrderState.DRAFT) {
          throw new BadRequestException('Cannot modify a locked order');
        }
      } else if (dto.bookingId) {
        console.log(`[PrepareOrder] Looking for order by bookingId: ${dto.bookingId}`);
        
        // Check for existing order (NO TRANSACTION for reads)
        console.log(`[PrepareOrder] Checking for existing order with bookingId ${dto.bookingId}`);
        let existingBookingOrder = await this.prisma.order.findFirst({
          where: { 
            bookingId: dto.bookingId,
            merchantId: user.merchantId 
          },
          select: {
            id: true,
            state: true,
            subtotal: true,
            taxAmount: true,
            totalAmount: true,
            paidAmount: true,
            balanceDue: true,
            customerId: true,
            bookingId: true,
            items: {
              select: {
                id: true,
                itemType: true,
                itemId: true,
                description: true,
                quantity: true,
                unitPrice: true,
                discount: true,
                taxRate: true,
                taxAmount: true,
                total: true,
                staffId: true,
              }
            },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
              }
            },
          },
        });
        
        if (existingBookingOrder) {
          console.log(`[PrepareOrder] Found existing order ${existingBookingOrder.id} for booking ${dto.bookingId}`);
        } else {
          console.log(`[PrepareOrder] No existing order found for booking ${dto.bookingId}, will create new one`);
        }
        
        if (existingBookingOrder) {
          console.log(`[PrepareOrder] Using existing order ${existingBookingOrder.id} for booking ${dto.bookingId}`);
          // Fetch complete order data (NO TRANSACTION for reads)
          const completeExistingOrder = await this.prisma.order.findUnique({
            where: { id: existingBookingOrder.id },
            include: {
              items: true,
              payments: true,
              customer: true,
              booking: true,
            },
          });
          
          if (!completeExistingOrder) {
            throw new Error('Failed to fetch complete existing order');
          }
          
          order = completeExistingOrder;
        } else {
          // Create new order for booking - use createOrderFromBooking logic
          console.log(`[PrepareOrder] Creating new order for booking ${dto.bookingId}`);
          
          // Generate order number if not already generated
          if (!orderNumber) {
            orderNumber = await this.generateOrderNumber(user.merchantId);
          }
          
          // Get booking details (NO TRANSACTION for reads)
          const booking = await this.prisma.booking.findFirst({
            where: { 
              id: dto.bookingId,
              merchantId: user.merchantId 
            },
            select: {
              id: true,
              locationId: true,
              customerId: true,
              services: {
                select: {
                  id: true,
                  serviceId: true,
                  staffId: true,
                  price: true,
                  duration: true,
                  service: {
                    select: {
                      name: true,
                    }
                  }
                }
              },
            },
          });
          
          if (!booking) {
            throw new NotFoundException('Booking not found');
          }
          
          // Create the order (SMALL TRANSACTION just for creation)
          order = await this.prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
            data: {
              merchantId: user.merchantId,
              locationId: booking.locationId,
              customerId: booking.customerId,
              bookingId: booking.id,
              orderNumber: orderNumber!,
              state: OrderState.DRAFT,
              subtotal: new Decimal(0),
              taxAmount: new Decimal(0),
              totalAmount: new Decimal(0),
              balanceDue: new Decimal(0),
              createdById: createdById!,
            },
            include: {
              items: true,
              payments: true,
              customer: true,
              booking: true,
            },
          });
          
          // Add booking services as order items
          const items = booking.services.map(bs => ({
            orderId: newOrder.id,
            itemType: 'SERVICE',
            itemId: bs.serviceId,
            description: bs.service.name,
            quantity: new Decimal(1),
            unitPrice: new Decimal(typeof bs.price === 'object' && bs.price.toNumber ? bs.price.toNumber() : Number(bs.price)),
            discount: new Decimal(0),
            taxRate: new Decimal(0),
            taxAmount: new Decimal(0),
            total: new Decimal(0),
            staffId: bs.staffId,
            metadata: {
              bookingServiceId: bs.id,
              duration: bs.duration,
            },
            sortOrder: 0,
          }));
          
          if (items.length > 0) {
            await tx.orderItem.createMany({
              data: items,
            });
            
            // Fetch the created items to include in the order
            const orderItems = await tx.orderItem.findMany({
              where: { orderId: newOrder.id },
            });
            
            newOrder.items = orderItems;
          }
          
          return newOrder;
          }); // End small transaction
          
          // Cache the new order ID (OUTSIDE transaction)
          const newBookingCacheKey = RedisService.getOrderByBookingCacheKey(booking.id);
          await this.redisService.set(newBookingCacheKey, order.id, 300); // 5 minutes
        }
      } else {
        // Create new order without booking
        const customerId = dto.isWalkIn ? null : dto.customerId || null;
        
        order = await this.prisma.order.create({
          data: {
            merchantId: user.merchantId,
            locationId: user.locationId || user.locations?.[0]?.id,
            customerId,
            bookingId: dto.bookingId,
            orderNumber: orderNumber!,
            state: OrderState.DRAFT,
            subtotal: new Decimal(0),
            taxAmount: new Decimal(0),
            totalAmount: new Decimal(0),
            balanceDue: new Decimal(0),
            createdById: createdById!,
          },
          include: {
            items: true,
            payments: true,
            customer: true,
            booking: true,
          },
        });
      }
      
      // Step 2: Add items if provided (OUTSIDE transaction)
      if (dto.items && dto.items.length > 0) {
        const createdItems = await Promise.all(
          dto.items.map((item, index) =>
            this.prisma.orderItem.create({
              data: {
                orderId: order.id,
                itemType: item.itemType,
                itemId: item.itemId,
                description: item.description,
                quantity: new Decimal(item.quantity),
                unitPrice: new Decimal(item.unitPrice),
                discount: new Decimal(item.discount || 0),
                taxRate: new Decimal(item.taxRate || 0),
                taxAmount: new Decimal(0),
                total: new Decimal(0),
                staffId: item.staffId,
                metadata: item.metadata,
                sortOrder: index,
              },
            })
          )
        );
        
        // Add created items to order object
        order.items.push(...createdItems);
      }
      
      // Step 3: Add order modifier if provided (OUTSIDE transaction)
      if (dto.orderModifier) {
        await this.prisma.orderModifier.create({
          data: {
            orderId: order.id,
            type: dto.orderModifier.type,
            calculation: OrderModifierCalculation.FIXED_AMOUNT,
            value: new Decimal(dto.orderModifier.amount),
            amount: new Decimal(0), // Will be calculated
            description: dto.orderModifier.description,
          },
        });
      }
      
      // Step 4: Recalculate order totals (OUTSIDE transaction)
      await this.recalculateOrderTotals(order.id);
      
      // Step 5: Fetch the updated order with calculated totals
      const updatedOrder = await this.prisma.order.findUnique({
        where: { id: order.id },
        include: {
          items: true,
          payments: true,
          customer: true,
          booking: true,
          modifiers: true,
        },
      });
      
      if (!updatedOrder) {
        throw new Error('Failed to fetch updated order');
      }
      
      console.log(`[PrepareOrder] Order prepared in ${Date.now() - startTime}ms`);
      
      // Use the already fetched complete order
      const completeOrder = updatedOrder;
    
    // Build response
    const response: PaymentInitResponseDto = {
      order: completeOrder,
      paymentGateway: {
        provider: paymentGateway.provider,
        config: paymentGateway.config,
      },
      merchant: merchant!,
      location: location || {
        id: user.locationId || '',
        name: 'Default',
        settings: {},
      },
    };
    
    // Include customer if present
    if (completeOrder.customer) {
      response.customer = completeOrder.customer;
    }
    
    // Include booking if present
    if (completeOrder.booking) {
      response.booking = completeOrder.booking;
    }
    
    console.log(`[PrepareOrder] Completed in ${Date.now() - startTime}ms`);
    return response;
    } catch (error: any) {
      console.error('[PrepareOrder] Error:', error);
      
      // Handle specific database errors
      if (error.code === 'P2024' || error.message?.includes('pool')) {
        throw new Error('Database connection pool exhausted. Please try again in a moment.');
      }
      
      if (error.code === 'P2034' || error.message?.includes('timeout')) {
        throw new Error('Database operation timed out. Please try again.');
      }
      
      // Re-throw other errors
      throw error;
    }
  }
  
  // Helper method for recalculating totals within a transaction
  private async recalculateOrderTotalsInTransaction(tx: any, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        modifiers: true,
        payments: true,
      },
    });
    
    if (!order) {
      throw new Error('Order not found for recalculation');
    }
    
    // Calculate subtotal from items and prepare batch updates
    let subtotal = new Decimal(0);
    let taxAmount = new Decimal(0);
    const itemUpdates = [];
    
    for (const item of order.items) {
      const itemSubtotal = new Decimal(item.unitPrice)
        .mul(new Decimal(item.quantity))
        .sub(new Decimal(item.discount || 0));
      
      const itemTax = itemSubtotal.mul(new Decimal(item.taxRate || 0));
      const itemTotal = itemSubtotal.add(itemTax);
      
      // Prepare update for batch execution
      itemUpdates.push({
        where: { id: item.id },
        data: {
          taxAmount: itemTax,
          total: itemTotal,
        },
      });
      
      subtotal = subtotal.add(itemSubtotal);
      taxAmount = taxAmount.add(itemTax);
    }
    
    // Execute all item updates in parallel
    if (itemUpdates.length > 0) {
      await Promise.all(
        itemUpdates.map(update => 
          tx.orderItem.update(update)
        )
      );
    }
    
    // Start with subtotal + tax
    let totalAmount = subtotal.add(taxAmount);
    
    // Apply modifiers and prepare batch updates
    const modifierUpdates = [];
    for (const modifier of order.modifiers || []) {
      let modifierAmount = new Decimal(0);
      
      if (modifier.calculation === OrderModifierCalculation.PERCENTAGE) {
        modifierAmount = subtotal.mul(new Decimal(modifier.value).div(100));
      } else {
        modifierAmount = new Decimal(modifier.value);
      }
      
      if (modifier.type === OrderModifierType.DISCOUNT) {
        modifierAmount = modifierAmount.neg();
      }
      
      modifierUpdates.push({
        where: { id: modifier.id },
        data: { amount: modifierAmount },
      });
      
      totalAmount = totalAmount.add(modifierAmount);
    }
    
    // Execute all modifier updates in parallel
    if (modifierUpdates.length > 0) {
      await Promise.all(
        modifierUpdates.map(update => 
          tx.orderModifier.update(update)
        )
      );
    }
    
    // Calculate paid amount and balance due
    const paidAmount = order.payments.reduce(
      (sum, payment) => sum.add(new Decimal(payment.amount)),
      new Decimal(0)
    );
    
    const balanceDue = totalAmount.sub(paidAmount);
    
    // Update order totals
    await tx.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        taxAmount,
        totalAmount,
        paidAmount,
        balanceDue,
      },
    });
  }
}