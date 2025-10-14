import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/interfaces/notification.interface';
import { Decimal } from '@prisma/client/runtime/library';

type LoyaltyProgramType = 'VISITS' | 'POINTS';

interface AccrualParams {
  merchantId: string;
  customerId: string;
  programType: LoyaltyProgramType;
  currentValue: Prisma.Decimal | number;
}

interface RedemptionParams {
  merchantId: string;
  customerId: string;
}

@Injectable()
export class LoyaltyReminderService {
  private readonly logger = new Logger(LoyaltyReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleAccrual(params: AccrualParams): Promise<void> {
    const { merchantId, customerId, programType } = params;

    const touchpoints = await this.prisma.loyaltyReminderTouchpoint.findMany({
      where: {
        merchantId,
        isEnabled: true,
      },
      orderBy: { sequence: 'asc' },
    });

    if (touchpoints.length === 0) {
      return;
    }

    const currentValueDecimal = new Prisma.Decimal(params.currentValue);
    const currentValue = Number(currentValueDecimal);

    const [state, redeemCount] = await Promise.all([
      this.prisma.loyaltyReminderState.findUnique({
        where: {
          merchantId_customerId: {
            merchantId,
            customerId,
          },
        },
      }),
      this.prisma.loyaltyTransaction.count({
        where: {
          merchantId,
          customerId,
          type: 'REDEEMED',
        },
      }),
    ]);

    let lastTouchpointSent = state?.lastTouchpointSent ?? 0;
    const lastRedeemCount = state?.lastRedeemCount ?? 0;

    if (redeemCount > lastRedeemCount) {
      lastTouchpointSent = 0;
    }

    const nextTouchpoint = touchpoints
      .filter((tp) => tp.sequence > lastTouchpointSent)
      .find((tp) => Number(tp.thresholdValue) <= currentValue);

    const baseState = {
      merchantId,
      customerId,
      lastTouchpointSent: lastTouchpointSent,
      lastRedeemCount: redeemCount,
      lastValueSnapshot: currentValueDecimal,
    } as const;

    if (!nextTouchpoint) {
      await this.upsertState(baseState);
      return;
    }

    try {
      await this.sendTouchpoint({
        touchpoint: nextTouchpoint,
        merchantId,
        customerId,
        sequence: nextTouchpoint.sequence,
        currentValue,
        programType,
      });

      await this.upsertState({
        ...baseState,
        lastTouchpointSent: nextTouchpoint.sequence,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send loyalty reminder touchpoint ${nextTouchpoint.sequence} for customer ${customerId}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.upsertState(baseState);
    }
  }

  async handleRedemption(params: RedemptionParams): Promise<void> {
    const { merchantId, customerId } = params;

    const redeemCount = await this.prisma.loyaltyTransaction.count({
      where: {
        merchantId,
        customerId,
        type: 'REDEEMED',
      },
    });

    await this.upsertState({
      merchantId,
      customerId,
      lastTouchpointSent: 0,
      lastRedeemCount: redeemCount,
      lastValueSnapshot: new Decimal(0),
    });
  }

  private async upsertState(data: {
    merchantId: string;
    customerId: string;
    lastTouchpointSent: number;
    lastRedeemCount: number;
    lastValueSnapshot: Prisma.Decimal;
  }): Promise<void> {
    await this.prisma.loyaltyReminderState.upsert({
      where: {
        merchantId_customerId: {
          merchantId: data.merchantId,
          customerId: data.customerId,
        },
      },
      update: {
        lastTouchpointSent: data.lastTouchpointSent,
        lastRedeemCount: data.lastRedeemCount,
        lastValueSnapshot: data.lastValueSnapshot,
      },
      create: {
        merchantId: data.merchantId,
        customerId: data.customerId,
        lastTouchpointSent: data.lastTouchpointSent,
        lastRedeemCount: data.lastRedeemCount,
        lastValueSnapshot: data.lastValueSnapshot,
      },
    });
  }

  private async sendTouchpoint(params: {
    merchantId: string;
    customerId: string;
    touchpoint: {
      sequence: number;
      emailSubject: string | null;
      emailBody: string | null;
      smsBody: string | null;
      thresholdValue: Prisma.Decimal;
    };
    sequence: number;
    currentValue: number;
    programType: LoyaltyProgramType;
  }): Promise<void> {
    const { merchantId, customerId, touchpoint, sequence, currentValue, programType } = params;

    const [merchant, customer, program] = await Promise.all([
      this.prisma.merchant.findUnique({
        where: { id: merchantId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          website: true,
        },
      }),
      this.prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          emailNotifications: true,
          smsNotifications: true,
          notificationPreference: true,
        },
      }),
      this.prisma.loyaltyProgram.findFirst({
        where: { merchantId },
        select: {
          type: true,
          visitsRequired: true,
          visitRewardType: true,
          visitRewardValue: true,
          pointsValue: true,
        },
      }),
    ]);

    if (!merchant || !customer) {
      this.logger.warn(
        `Unable to send loyalty reminder touchpoint ${sequence} due to missing merchant or customer`,
      );
      return;
    }

    const emailSubject = touchpoint.emailSubject ?? undefined;
    const emailBody = touchpoint.emailBody ?? undefined;
    const smsBody = touchpoint.smsBody ?? undefined;

    if (!emailSubject && !smsBody) {
      this.logger.log(
        `Skipping loyalty reminder touchpoint ${sequence} for customer ${customerId} - no templates configured`,
      );
      return;
    }

    const notificationType = this.resolveNotificationType(sequence);

    await this.notificationsService.sendLoyaltyReminder({
      type: notificationType,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email ?? undefined,
        phone: merchant.phone ?? undefined,
        website: merchant.website ?? undefined,
      },
      customer: {
        id: customer.id,
        email: customer.email ?? undefined,
        phone: customer.phone ?? undefined,
        firstName: customer.firstName ?? undefined,
        lastName: customer.lastName ?? undefined,
        preferredChannel: (customer.notificationPreference as any) ?? 'both',
        emailNotifications: customer.emailNotifications,
        smsNotifications: customer.smsNotifications,
      },
      template: {
        emailSubject,
        emailBody,
        smsBody,
      },
      context: {
        programType,
        thresholdValue: Number(touchpoint.thresholdValue),
        currentValue,
        rewardType: program?.visitRewardType ?? null,
        rewardValue:
          program?.visitRewardValue !== undefined && program?.visitRewardValue !== null
            ? Number(program.visitRewardValue)
            : null,
        pointsValue:
          program?.pointsValue !== undefined && program?.pointsValue !== null
            ? Number(program.pointsValue)
            : null,
      },
    });
  }

  private resolveNotificationType(sequence: number): NotificationType {
    switch (sequence) {
      case 1:
        return NotificationType.LOYALTY_TOUCHPOINT_1;
      case 2:
        return NotificationType.LOYALTY_TOUCHPOINT_2;
      default:
        return NotificationType.LOYALTY_TOUCHPOINT_3;
    }
  }
}
