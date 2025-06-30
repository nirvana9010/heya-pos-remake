import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderState, OrderModifierType, OrderModifierCalculation } from '@heya-pos/types';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(data: {
    merchantId: string;
    locationId: string;
    customerId?: string;
    bookingId?: string;
    createdById: string;
  }) {
    // Generate unique order number
    const orderNumber = await this.generateOrderNumber(data.merchantId);

    return this.prisma.order.create({
      data: {
        ...data,
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

    return this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: true,
        modifiers: true,
        payments: true,
      },
    });
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
            taxRate: new Decimal(item.taxRate || 0.1),
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

    if (order.state !== OrderState.DRAFT && order.state !== OrderState.LOCKED) {
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

    // Calculate item totals
    let subtotal = new Decimal(0);
    let taxAmount = new Decimal(0);

    for (const item of order.items) {
      // Convert to Decimal if needed
      const quantity = new Decimal(item.quantity);
      const unitPrice = new Decimal(item.unitPrice);
      const discount = new Decimal(item.discount || 0);
      const taxRate = new Decimal(item.taxRate || 0);

      const itemSubtotal = quantity.mul(unitPrice).sub(discount);
      const itemTax = itemSubtotal.mul(taxRate);
      const itemTotal = itemSubtotal.add(itemTax);

      await this.prisma.orderItem.update({
        where: { id: item.id },
        data: {
          taxAmount: itemTax,
          total: itemTotal,
        },
      });

      subtotal = subtotal.add(itemSubtotal);
      taxAmount = taxAmount.add(itemTax);
    }

    // Apply modifiers
    let totalAmount = subtotal.add(taxAmount);
    
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

      await this.prisma.orderModifier.update({
        where: { id: modifier.id },
        data: { amount: modifierAmount },
      });

      totalAmount = totalAmount.add(modifierAmount);
    }

    // Calculate paid amount and balance due
    const paidAmount = order.payments.reduce(
      (sum, payment) => sum.add(new Decimal(payment.amount)),
      new Decimal(0)
    );

    const balanceDue = totalAmount.sub(paidAmount);

    // Update order totals
    await this.prisma.order.update({
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

  private async generateOrderNumber(merchantId: string): Promise<string> {
    // Get the current date
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Get today's order count for this merchant
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const orderCount = await this.prisma.order.count({
      where: {
        merchantId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Generate order number: OR-YYMMDD-XXXX
    const sequenceNumber = (orderCount + 1).toString().padStart(4, '0');
    return `OR-${year}${month}${day}-${sequenceNumber}`;
  }

  async createOrderFromBooking(bookingId: string, merchantId: string, staffId: string) {
    console.log(`[PERF] createOrderFromBooking - start`);
    const bookingStart = Date.now();
    
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

    // Check if order already exists for this booking
    const orderCheckStart = Date.now();
    const existingOrder = await this.prisma.order.findFirst({
      where: { bookingId },
      include: {
        items: true,
      },
    });
    console.log(`[PERF] Order check took ${Date.now() - orderCheckStart}ms`);

    if (existingOrder) {
      // Check if order has items, if not and it's still in DRAFT, add them
      if ((!existingOrder.items || existingOrder.items.length === 0) && existingOrder.state === 'DRAFT') {
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
        await this.addOrderItems(existingOrder.id, merchantId, items);
        console.log(`[PERF] Add items took ${Date.now() - addItemsStart}ms`);
      }
      
      // For performance, just return the basic order data we need
      const findOrderStart = Date.now();
      const result = await this.prisma.order.findFirst({
        where: { id: existingOrder.id, merchantId },
        include: {
          items: true,
          payments: true,
        },
      });
      console.log(`[PERF] Find order (optimized) took ${Date.now() - findOrderStart}ms`);
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

    return this.findOrder(order.id, merchantId);
  }
}