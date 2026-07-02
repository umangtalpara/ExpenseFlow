import { Injectable, BadRequestException } from '@nestjs/common';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { getTenantId, tenantLocalStorage, runWithTenant } from '../../common/tenant/tenant.context';

@Injectable()
export class AuditLogsService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async log(data: {
    action: string;
    entityType?: string;
    entityId?: string;
    details?: any;
    organizationId?: string;
    userId?: string;
  }) {
    const tenantId = getTenantId() || data.organizationId;
    const store = tenantLocalStorage.getStore();
    const userId = store?.userId || data.userId;

    if (!tenantId) {
      throw new BadRequestException('Organization context is required for audit logs');
    }

    let result;
    await new Promise<void>((resolve, reject) => {
      runWithTenant(tenantId, async () => {
        try {
          result = await this.auditLogRepository.create({
            organization: tenantId as any,
            user: userId ? (userId as any) : undefined,
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
            details: data.details,
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    return result;
  }

  async findAll(filters: {
    action?: string;
    entityType?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ? Number(filters.page) : 1;
    const limit = filters.limit ? Number(filters.limit) : 20;

    const query: Record<string, any> = {};

    if (filters.action) {
      query.action = filters.action;
    }
    if (filters.entityType) {
      query.entityType = filters.entityType;
    }
    if (filters.userId) {
      query.user = filters.userId;
    }
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.timestamp.$lte = new Date(filters.endDate);
      }
    }

    return this.auditLogRepository.findPaginated(query, {}, page, limit);
  }
}
