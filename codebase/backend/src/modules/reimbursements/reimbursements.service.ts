import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ReimbursementRepository } from './repositories/reimbursement.repository';
import { ExpenseRepository } from '../expenses/repositories/expense.repository';
import { PaymentMethodRepository } from '../payment-methods/repositories/payment-method.repository';
import { OrganizationRepository } from '../organizations/repositories/organization.repository';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { getTenantId } from '../../common/tenant/tenant.context';
import { ReimbursementStatus } from './schemas/reimbursement.schema';
import { ExpenseStatus } from '../expenses/schemas/expense.schema';
import { CreateReimbursementDto, PayReimbursementDto } from './dto/reimbursement.dto';
import { Types } from 'mongoose';

@Injectable()
export class ReimbursementsService {
  constructor(
    private readonly reimbursementRepository: ReimbursementRepository,
    private readonly expenseRepository: ExpenseRepository,
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async generateBatch(userId: string, dto: CreateReimbursementDto) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Organization context is required');
    }

    // 1. Gather Approved Expenses that are not already associated with any reimbursement batch
    let filter: Record<string, any> = {
      status: ExpenseStatus.APPROVED,
    };

    if (dto.expenseIds && dto.expenseIds.length > 0) {
      const objIds = dto.expenseIds.map((id) => new Types.ObjectId(id));
      filter._id = { $in: objIds };
    }

    const expenses = await this.expenseRepository.find(filter);

    // Filter out expenses that are already in another reimbursement batch (to be safe)
    const activeBatches = await this.reimbursementRepository.find({
      status: { $in: [ReimbursementStatus.DRAFT, ReimbursementStatus.PROCESSING, ReimbursementStatus.PAID] },
    });
    const alreadyBatchedIds = new Set<string>();
    for (const batch of activeBatches) {
      for (const exp of batch.expenses) {
        alreadyBatchedIds.add((exp as any)._id ? (exp as any)._id.toString() : exp.toString());
      }
    }

    const eligibleExpenses = expenses.filter((e) => !alreadyBatchedIds.has(e._id.toString()));

    if (eligibleExpenses.length === 0) {
      throw new BadRequestException('No eligible approved expenses found to generate batch');
    }

    // 2. Fetch Base Currency from Organization
    const org = await this.organizationRepository.findById(tenantId);
    const currency = org?.currency || 'USD';

    // 3. Compute Total Amount based on convertedAmount of these expenses
    const totalAmount = eligibleExpenses.reduce((sum, e) => sum + (e.convertedAmount || e.amount), 0);

    // 4. Create Draft Reimbursement Batch
    const batch = await this.reimbursementRepository.create({
      organization: tenantId as any,
      batchName: dto.batchName,
      status: ReimbursementStatus.DRAFT,
      expenses: eligibleExpenses.map((e) => e._id) as any[],
      totalAmount,
      currency,
      notes: dto.notes,
      createdBy: new Types.ObjectId(userId) as any,
    });

    // Write manual audit log
    await this.auditLogsService.log({
      action: 'BATCH_GENERATED',
      entityType: 'Reimbursement',
      entityId: batch._id.toString(),
      details: { batchName: batch.batchName, totalAmount, currency, expenseCount: eligibleExpenses.length },
    });

    return batch;
  }

  async payBatch(batchId: string, userId: string, dto: PayReimbursementDto) {
    const batch = await this.reimbursementRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException('Reimbursement batch not found');
    }

    if (batch.status === ReimbursementStatus.PAID) {
      throw new ConflictException('Reimbursement batch is already paid');
    }

    // Verify Payment Method
    const pm = await this.paymentMethodRepository.findById(dto.paymentMethodId);
    if (!pm) {
      throw new BadRequestException('Invalid payment method selected');
    }

    // Update batch to PAID
    const updatedBatch = await this.reimbursementRepository.update(batchId, {
      status: ReimbursementStatus.PAID,
      paymentMethod: pm._id as any,
      referenceNumber: dto.referenceNumber,
      payoutDate: new Date(dto.payoutDate),
      notes: dto.notes || batch.notes,
    });

    // Update associated expenses status to REIMBURSED (one by one to trigger save/update hooks & audit trail!)
    for (const exp of batch.expenses) {
      const expId = (exp as any)._id ? (exp as any)._id.toString() : exp.toString();
      await this.expenseRepository.update(expId, { status: ExpenseStatus.REIMBURSED });
    }

    // Write manual audit log
    await this.auditLogsService.log({
      action: 'BATCH_PAID',
      entityType: 'Reimbursement',
      entityId: batchId,
      details: {
        batchName: batch.batchName,
        totalAmount: batch.totalAmount,
        currency: batch.currency,
        referenceNumber: dto.referenceNumber,
        paymentMethodName: pm.name,
      },
    });

    return updatedBatch;
  }

  async findAll(status?: ReimbursementStatus) {
    const query: Record<string, any> = {};
    if (status) {
      query.status = status;
    }
    return this.reimbursementRepository.find(query);
  }

  async findOne(id: string) {
    const batch = await this.reimbursementRepository.findById(id);
    if (!batch) {
      throw new NotFoundException('Reimbursement batch not found');
    }
    return batch;
  }

  async getLedger(filters: {
    paymentMethodId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ? Number(filters.page) : 1;
    const limit = filters.limit ? Number(filters.limit) : 20;

    const query: Record<string, any> = {
      status: ReimbursementStatus.PAID,
    };

    if (filters.paymentMethodId) {
      query.paymentMethod = filters.paymentMethodId;
    }

    if (filters.startDate || filters.endDate) {
      query.payoutDate = {};
      if (filters.startDate) {
        query.payoutDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.payoutDate.$lte = new Date(filters.endDate);
      }
    }

    return this.reimbursementRepository.findPaginated(query, {}, page, limit);
  }

  async delete(id: string) {
    const batch = await this.reimbursementRepository.findById(id);
    if (!batch) {
      throw new NotFoundException('Reimbursement batch not found');
    }

    if (batch.status === ReimbursementStatus.PAID) {
      throw new ConflictException('Cannot delete a paid reimbursement batch');
    }

    const deleted = await this.reimbursementRepository.delete(id);

    // Write manual audit log
    await this.auditLogsService.log({
      action: 'BATCH_DELETED',
      entityType: 'Reimbursement',
      entityId: id,
      details: { batchName: batch.batchName, totalAmount: batch.totalAmount },
    });

    return deleted;
  }
}
