import { Injectable, Logger } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogEntry {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a critical operation. Never throws — audit must never block the main flow.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          userEmail: entry.userEmail,
          userRole: entry.userRole,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: entry.metadata as object | undefined,
          success: entry.success ?? true,
          errorMessage: entry.errorMessage,
        },
      });
    } catch (err) {
      // Log to console but NEVER propagate — audit failures must be silent
      this.logger.error(`Failed to write audit log [${entry.action}]: ${String(err)}`);
    }
  }

  /**
   * Query audit logs (admin only).
   */
  async findAll(opts: {
    userId?: string;
    action?: AuditAction;
    resourceType?: string;
    resourceId?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50 } = opts;
    const skip = (page - 1) * limit;

    const where = {
      ...(opts.userId && { userId: opts.userId }),
      ...(opts.action && { action: opts.action }),
      ...(opts.resourceType && { resourceType: opts.resourceType }),
      ...(opts.resourceId && { resourceId: opts.resourceId }),
      ...(opts.fromDate || opts.toDate
        ? {
            createdAt: {
              ...(opts.fromDate && { gte: opts.fromDate }),
              ...(opts.toDate && { lte: opts.toDate }),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, meta: { page, limit, total } };
  }
}
