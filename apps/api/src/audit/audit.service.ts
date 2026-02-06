import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditLogParams {
  merchantId: string;
  staffId?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      const staffId = await this.resolveAndValidateStaffId(
        params.merchantId,
        params.staffId,
      );
      if (!staffId) {
        this.logger.warn(
          `Audit skipped (no valid staff): action=${params.action} merchant=${params.merchantId}`,
        );
        return;
      }
      await this.prisma.auditLog.create({
        data: {
          merchantId: params.merchantId,
          staffId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          details: params.details ?? {},
          ipAddress: params.ipAddress,
        },
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(
        `Audit write failed: action=${params.action} error=${msg}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async resolveAndValidateStaffId(
    merchantId: string,
    hint?: string,
  ): Promise<string | null> {
    if (hint) {
      const valid = await this.prisma.staff.findFirst({
        where: { id: hint, merchantId, status: "ACTIVE" },
        select: { id: true },
      });
      if (valid) return valid.id;
      this.logger.debug(
        `Staff hint ${hint} invalid for merchant ${merchantId}, falling back`,
      );
    }
    const fallback = await this.prisma.staff.findFirst({
      where: { merchantId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    return fallback?.id ?? null;
  }
}
