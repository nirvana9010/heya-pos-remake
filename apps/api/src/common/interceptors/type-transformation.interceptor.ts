import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TypeTransformationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TypeTransformationInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => this.transformResponse(data)),
    );
  }

  private transformResponse(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (data instanceof Date) {
      return data.toISOString();
    }

    if (data instanceof Decimal) {
      return data.toNumber();
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.transformResponse(item));
    }

    if (typeof data === 'object') {
      const transformed: any = {};

      for (const [key, value] of Object.entries(data)) {
        // Transform specific field patterns
        if (this.isMoneyField(key)) {
          transformed[key] = this.transformMoney(value);
        } else if (this.isDateField(key)) {
          transformed[key] = this.transformDate(value);
        } else if (this.isDecimalField(key)) {
          transformed[key] = this.transformDecimal(value);
        } else {
          transformed[key] = this.transformResponse(value);
        }
      }

      return transformed;
    }

    return data;
  }

  private isMoneyField(fieldName: string): boolean {
    const moneyFields = [
      'price',
      'amount',
      'totalAmount',
      'subtotal',
      'taxAmount',
      'discountAmount',
      'paidAmount',
      'balanceDue',
      'depositAmount',
      'totalSpent',
      'monthlyPrice',
      'unitPrice',
      'tipAmount',
      'refundedAmount',
    ];
    return moneyFields.includes(fieldName) || fieldName.endsWith('Price') || fieldName.endsWith('Amount');
  }

  private isDateField(fieldName: string): boolean {
    const dateFields = [
      'createdAt',
      'updatedAt',
      'startTime',
      'endTime',
      'dueDate',
      'dateOfBirth',
      'hireDate',
      'lastLogin',
      'lastLoginAt',
      'confirmedAt',
      'checkedInAt',
      'completedAt',
      'cancelledAt',
      'processedAt',
      'refundedAt',
      'sentAt',
      'paidAt',
      'voidedAt',
      'lockedAt',
      'failedAt',
      'expiresAt',
      'joinedAt',
      'lastActivityAt',
      'subscriptionEnds',
      'trialEndsAt',
    ];
    return dateFields.includes(fieldName) || fieldName.endsWith('At') || fieldName.endsWith('Date');
  }

  private isDecimalField(fieldName: string): boolean {
    const decimalFields = [
      'quantity',
      'commissionRate',
      'taxRate',
      'loyaltyPoints',
      'points',
      'lifetimePoints',
      'visitsDelta',
      'balance',
      'percentage',
      'multiplier',
      'pointsPerVisit',
      'pointsPerDollar',
      'pointsPerCurrency',
      'rewardThreshold',
      'rewardValue',
      'pointsValue',
      'requiredPoints',
    ];
    return decimalFields.includes(fieldName);
  }

  private transformMoney(value: any): number {
    if (value === null || value === undefined) return value;
    
    if (value instanceof Decimal) {
      return value.toNumber();
    }
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
    }
    
    if (typeof value === 'number') {
      return Math.round(value * 100) / 100;
    }
    
    return value;
  }

  private transformDate(value: any): string | null {
    if (value === null || value === undefined) return value;
    
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    if (typeof value === 'string') {
      try {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toISOString();
      } catch {
        return value;
      }
    }
    
    return value;
  }

  private transformDecimal(value: any): number {
    if (value === null || value === undefined) return value;
    
    if (value instanceof Decimal) {
      return value.toNumber();
    }
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return value;
  }
}