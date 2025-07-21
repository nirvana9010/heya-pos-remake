import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { toNumber, addDecimals, subtractDecimals, multiplyDecimals, isLessThan, toDecimal } from '../utils/decimal';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  // Get or create loyalty program for merchant
  async getProgram(merchantId: string) {
    return this.prisma.loyaltyProgram.findFirst({
      where: { merchantId }
    });
  }

  // Save loyalty program settings
  async updateProgram(merchantId: string, data: any) {
    const existing = await this.getProgram(merchantId);
    
    if (existing) {
      return this.prisma.loyaltyProgram.update({
        where: { id: existing.id },
        data
      });
    }
    
    // Create new program with default name
    return this.prisma.loyaltyProgram.create({
      data: {
        merchantId,
        name: 'Loyalty Program',
        ...data
      }
    });
  }

  // Process booking completion
  async processBookingCompletion(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { 
        customer: true,
        createdBy: true
      }
    });

    if (!booking || booking.status !== 'COMPLETED') return;

    const program = await this.getProgram(booking.merchantId);
    if (!program?.isActive) return;

    if (program.type === 'VISITS') {
      await this.earnVisit(booking, program);
    } else {
      await this.earnPoints(booking, program);
    }
  }

  // Process order completion (for direct sales)
  async processOrderCompletion(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        customer: true,
        createdBy: true
      }
    });

    if (!order || order.state !== 'PAID' || !order.customerId) return;

    const program = await this.getProgram(order.merchantId);
    if (!program?.isActive) return;

    // Create a booking-like object for compatibility with existing methods
    const orderData = {
      id: order.id,
      merchantId: order.merchantId,
      customerId: order.customerId,
      totalAmount: order.totalAmount,
      createdById: order.createdById
    };

    if (program.type === 'VISITS') {
      await this.earnVisitFromOrder(orderData, program);
    } else {
      await this.earnPointsFromOrder(orderData, program);
    }
  }

  // Earn a visit (punch card)
  private async earnVisit(booking: any, program: any) {
    // Check if this booking already earned a visit
    const existingTransaction = await this.prisma.loyaltyTransaction.findFirst({
      where: {
        bookingId: booking.id,
        type: 'EARNED',
        visitsDelta: { gt: 0 }
      }
    });

    if (existingTransaction) {
      return { alreadyEarned: true };
    }
    
    // Increment visit count and update stats
    const customer = await this.prisma.customer.update({
      where: { id: booking.customerId },
      data: {
        loyaltyVisits: { increment: 1 },
        lifetimeVisits: { increment: 1 },
        visitCount: { increment: 1 },
        totalSpent: { increment: booking.totalAmount || 0 }
      }
    });

    // Record transaction
    await this.prisma.loyaltyTransaction.create({
      data: {
        customerId: booking.customerId,
        merchantId: booking.merchantId,
        bookingId: booking.id,
        type: 'EARNED',
        visitsDelta: 1,
        description: 'Visit earned from booking',
        createdByStaffId: booking.createdById
      }
    });

    // Check if reward earned
    const newVisitCount = customer.loyaltyVisits + 1; // Account for increment
    if (program.visitsRequired && newVisitCount >= program.visitsRequired) {
      return { 
        rewardAvailable: true,
        visitsCompleted: newVisitCount,
        visitsRequired: program.visitsRequired
      };
    }

    return { 
      rewardAvailable: false,
      visitsCompleted: newVisitCount,
      visitsRequired: program.visitsRequired || 10
    };
  }

  // Earn points
  private async earnPoints(booking: any, program: any) {
    // Check if this booking already earned points
    const existingTransaction = await this.prisma.loyaltyTransaction.findFirst({
      where: {
        bookingId: booking.id,
        type: 'EARNED',
        points: { gt: 0 }
      }
    });

    if (existingTransaction) {
      return { alreadyEarned: true };
    }

    const pointsPerDollar = program.pointsPerDollar || 1;
    const pointsEarned = Math.floor(booking.totalAmount * pointsPerDollar);

    if (pointsEarned === 0) return { pointsEarned: 0 };

    // Add points and update stats
    const updatedCustomer = await this.prisma.customer.update({
      where: { id: booking.customerId },
      data: {
        loyaltyPoints: { increment: pointsEarned },
        visitCount: { increment: 1 },
        totalSpent: { increment: booking.totalAmount || 0 }
      }
    });

    // Record transaction
    await this.prisma.loyaltyTransaction.create({
      data: {
        customerId: booking.customerId,
        merchantId: booking.merchantId,
        bookingId: booking.id,
        type: 'EARNED',
        points: pointsEarned,
        balance: addDecimals(updatedCustomer.loyaltyPoints, pointsEarned),
        description: `Earned ${pointsEarned} points from booking`,
        createdByStaffId: booking.createdById
      }
    });

    return { 
      pointsEarned,
      newBalance: addDecimals(updatedCustomer.loyaltyPoints, pointsEarned)
    };
  }

  // Earn a visit from order (punch card)
  private async earnVisitFromOrder(order: any, program: any) {
    // Check if this order already earned a visit
    const existingTransaction = await this.prisma.loyaltyTransaction.findFirst({
      where: {
        orderId: order.id,
        type: 'EARNED',
        visitsDelta: { gt: 0 }
      }
    });

    if (existingTransaction) {
      return { alreadyEarned: true };
    }
    
    // Increment visit count and update stats
    const customer = await this.prisma.customer.update({
      where: { id: order.customerId },
      data: {
        loyaltyVisits: { increment: 1 },
        lifetimeVisits: { increment: 1 },
        visitCount: { increment: 1 },
        totalSpent: { increment: order.totalAmount || 0 }
      }
    });

    // Record transaction
    await this.prisma.loyaltyTransaction.create({
      data: {
        customerId: order.customerId,
        merchantId: order.merchantId,
        orderId: order.id,
        type: 'EARNED',
        visitsDelta: 1,
        description: 'Visit earned from order',
        createdByStaffId: order.createdById
      }
    });

    // Check if reward earned
    const newVisitCount = customer.loyaltyVisits + 1; // Account for increment
    if (program.visitsRequired && newVisitCount >= program.visitsRequired) {
      return { 
        rewardAvailable: true,
        visitsCompleted: newVisitCount,
        visitsRequired: program.visitsRequired
      };
    }

    return { 
      rewardAvailable: false,
      visitsCompleted: newVisitCount,
      visitsRequired: program.visitsRequired || 10
    };
  }

  // Earn points from order
  private async earnPointsFromOrder(order: any, program: any) {
    // Check if this order already earned points
    const existingTransaction = await this.prisma.loyaltyTransaction.findFirst({
      where: {
        orderId: order.id,
        type: 'EARNED',
        points: { gt: 0 }
      }
    });

    if (existingTransaction) {
      return { alreadyEarned: true };
    }

    const pointsPerDollar = program.pointsPerDollar || 1;
    const pointsEarned = Math.floor(order.totalAmount * pointsPerDollar);

    if (pointsEarned === 0) return { pointsEarned: 0 };

    // Add points and update stats
    const updatedCustomer = await this.prisma.customer.update({
      where: { id: order.customerId },
      data: {
        loyaltyPoints: { increment: pointsEarned },
        visitCount: { increment: 1 },
        totalSpent: { increment: order.totalAmount || 0 }
      }
    });

    // Record transaction
    await this.prisma.loyaltyTransaction.create({
      data: {
        customerId: order.customerId,
        merchantId: order.merchantId,
        orderId: order.id,
        type: 'EARNED',
        points: pointsEarned,
        balance: addDecimals(updatedCustomer.loyaltyPoints, pointsEarned),
        description: `Earned ${pointsEarned} points from order`,
        createdByStaffId: order.createdById
      }
    });

    return { 
      pointsEarned,
      newBalance: addDecimals(updatedCustomer.loyaltyPoints, pointsEarned)
    };
  }

  // Get customer loyalty status
  async getCustomerLoyalty(customerId: string, merchantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        merchantId
      }
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const program = await this.getProgram(merchantId);
    
    // Get recent transactions
    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: {
        customerId,
        merchantId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      include: {
        booking: true,
        createdBy: true
      }
    });

    if (program?.type === 'VISITS') {
      return {
        type: 'VISITS',
        currentVisits: customer.loyaltyVisits,
        visitsRequired: program.visitsRequired || 10,
        rewardAvailable: customer.loyaltyVisits >= (program.visitsRequired || 10),
        rewardType: program.visitRewardType,
        rewardValue: program.visitRewardValue,
        lifetimeVisits: customer.lifetimeVisits,
        transactions
      };
    } else {
      return {
        type: 'POINTS',
        currentPoints: customer.loyaltyPoints,
        pointsValue: program?.pointsValue || 0.01,
        dollarValue: multiplyDecimals(customer.loyaltyPoints, program?.pointsValue || 0.01),
        transactions
      };
    }
  }

  // Redeem visits reward
  async redeemVisitReward(customerId: string, merchantId: string, bookingId?: string, staffId?: string) {
    const program = await this.getProgram(merchantId);
    if (!program || program.type !== 'VISITS') {
      throw new BadRequestException('Loyalty program not configured for visits');
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        merchantId
      }
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.loyaltyVisits < program.visitsRequired) {
      throw new BadRequestException(`Not enough visits. Required: ${program.visitsRequired}, Current: ${customer.loyaltyVisits}`);
    }

    // Reset visit count
    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyVisits: 0 // Reset punch card
      }
    });

    // Record redemption
    await this.prisma.loyaltyTransaction.create({
      data: {
        customerId,
        merchantId,
        bookingId,
        type: 'REDEEMED',
        visitsDelta: -program.visitsRequired,
        description: `Redeemed ${program.visitsRequired} visits for ${program.visitRewardType === 'FREE' ? 'free service' : `${program.visitRewardValue}% off`}`,
        // Don't set createdByStaffId for merchant-initiated redemptions
        createdByStaffId: null
      }
    });

    return {
      success: true,
      rewardType: program.visitRewardType,
      rewardValue: program.visitRewardValue,
      message: program.visitRewardType === 'FREE' 
        ? 'Free service reward applied!' 
        : `${program.visitRewardValue}% discount applied!`
    };
  }

  // Redeem points
  async redeemPoints(customerId: string, merchantId: string, points: number, bookingId?: string, staffId?: string) {
    const program = await this.getProgram(merchantId);
    if (!program || program.type !== 'POINTS') {
      throw new BadRequestException('Loyalty program not configured for points');
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        merchantId
      }
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (isLessThan(customer.loyaltyPoints, points)) {
      throw new BadRequestException(`Insufficient points. Available: ${toNumber(customer.loyaltyPoints)}, Requested: ${points}`);
    }

    const pointsValue = program.pointsValue || 0.01;
    const dollarValue = multiplyDecimals(points, pointsValue);

    // Deduct points
    const updatedCustomer = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: { decrement: points }
      }
    });

    // Record redemption
    await this.prisma.loyaltyTransaction.create({
      data: {
        customerId,
        merchantId,
        bookingId,
        type: 'REDEEMED',
        points: -points,
        balance: subtractDecimals(updatedCustomer.loyaltyPoints, points),
        description: `Redeemed ${points} points for $${dollarValue.toFixed(2)}`,
        // Don't set createdByStaffId for merchant-initiated redemptions
        createdByStaffId: null
      }
    });

    return { 
      success: true,
      dollarValue,
      remainingPoints: subtractDecimals(updatedCustomer.loyaltyPoints, points),
      message: `$${dollarValue.toFixed(2)} discount applied!`
    };
  }

  // Manual adjustment (for admin use)
  async adjustLoyalty(
    customerId: string, 
    merchantId: string, 
    adjustment: { points?: number; visits?: number; reason: string },
    staffId: string
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        merchantId
      }
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const updates: any = {};
    // Don't set createdByStaffId for merchant-initiated adjustments
    // The staffId passed in is actually a merchantAuthId when logged in as merchant
    const transactionData: any = {
      customerId,
      merchantId,
      type: 'ADJUSTED',
      description: adjustment.reason,
      // Leave createdByStaffId as null for merchant adjustments
      createdByStaffId: null
    };

    if (adjustment.points !== undefined) {
      updates.loyaltyPoints = { increment: adjustment.points };
      transactionData.points = adjustment.points;
      transactionData.balance = addDecimals(customer.loyaltyPoints, adjustment.points);
    }

    if (adjustment.visits !== undefined) {
      updates.loyaltyVisits = { increment: adjustment.visits };
      if (adjustment.visits > 0) {
        updates.lifetimeVisits = { increment: adjustment.visits };
      }
      transactionData.visitsDelta = adjustment.visits;
    }

    // Use a transaction to ensure both operations complete together
    const result = await this.prisma.$transaction(async (tx) => {
      // Update customer
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: updates
      });

      // Record transaction
      await tx.loyaltyTransaction.create({
        data: transactionData
      });

      return updatedCustomer;
    });

    return {
      success: true,
      customer: result,
      adjustment
    };
  }
}