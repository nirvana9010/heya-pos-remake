import { Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { Injectable } from '@nestjs/common';

// Define which models require tenant isolation
const TENANT_ISOLATED_MODELS: Prisma.ModelName[] = [
  'Booking',
  'Customer',
  'Service',
  'Staff',
  'StaffLocation',
  'ServiceCategory',
  'Invoice',
  'Order',
  'OrderItem',
  'OrderPayment',
  'LoyaltyProgram',
  'LoyaltyTransaction',
];

@Injectable()
export class TenantIsolationMiddleware {
  constructor(private readonly cls: ClsService) {}

  /**
   * Creates a Prisma middleware that enforces tenant isolation.
   * FAILS LOUDLY if tenant context is missing for protected models.
   */
  createMiddleware(): Prisma.Middleware {
    return async (params, next) => {
      // Skip if not a tenant-isolated model
      if (!params.model || !TENANT_ISOLATED_MODELS.includes(params.model as Prisma.ModelName)) {
        return next(params);
      }

      // Get tenant context
      const tenantId = this.cls.get('tenantId');
      
      // FAIL LOUDLY - This is critical for security
      if (!tenantId) {
        const error = new Error(
          `SECURITY VIOLATION: Attempted to access tenant-isolated model '${params.model}' ` +
          `without tenantId in context. Action: ${params.action}`
        );
        
        // Log this as a critical security event
        console.error(error.message, {
          model: params.model,
          action: params.action,
          stack: error.stack,
        });
        
        throw error;
      }

      // Apply tenant isolation based on the action
      const { action, args } = params;

      switch (action) {
        // Find operations
        case 'findUnique':
        case 'findUniqueOrThrow':
        case 'findFirst':
        case 'findFirstOrThrow':
        case 'findMany':
        case 'count':
        case 'aggregate':
        case 'groupBy':
          this.applyTenantFilter(args, tenantId);
          break;

        // Create operations
        case 'create':
        case 'createMany':
          this.applyTenantData(args, tenantId);
          break;

        // Update operations
        case 'update':
        case 'updateMany':
        case 'upsert':
          this.applyTenantFilter(args, tenantId);
          if (args.create) {
            this.applyTenantData({ data: args.create }, tenantId);
          }
          break;

        // Delete operations
        case 'delete':
        case 'deleteMany':
          this.applyTenantFilter(args, tenantId);
          break;
      }

      return next(params);
    };
  }

  private applyTenantFilter(args: any, tenantId: string) {
    if (!args.where) {
      args.where = {};
    }
    
    // If merchantId is already set and different, throw error
    if (args.where.merchantId && args.where.merchantId !== tenantId) {
      throw new Error(
        `SECURITY VIOLATION: Attempted to access data for tenant ${args.where.merchantId} ` +
        `while authenticated as tenant ${tenantId}`
      );
    }
    
    args.where.merchantId = tenantId;
  }

  private applyTenantData(args: any, tenantId: string) {
    if (args.data) {
      if (Array.isArray(args.data)) {
        // createMany case
        args.data = args.data.map(item => ({
          ...item,
          merchantId: tenantId,
        }));
      } else {
        // create/update case
        args.data.merchantId = tenantId;
      }
    }
  }
}

/**
 * Factory function to create the middleware
 * Usage in PrismaService:
 * 
 * constructor(private cls: ClsService) {
 *   const middleware = new TenantIsolationMiddleware(cls);
 *   this.$use(middleware.createMiddleware());
 * }
 */
export function createTenantIsolationMiddleware(cls: ClsService): Prisma.Middleware {
  const middleware = new TenantIsolationMiddleware(cls);
  return middleware.createMiddleware();
}