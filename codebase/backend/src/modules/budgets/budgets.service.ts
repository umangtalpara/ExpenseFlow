import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BudgetRepository } from './repositories/budget.repository';
import { AlertLogRepository } from './repositories/alert-log.repository';
import { ProjectRepository } from '../projects/repositories/project.repository';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';
import { BudgetScope, BudgetStatus, BudgetDocument } from './schemas/budget.schema';
import { getTenantId } from '../../common/tenant/tenant.context';
import { Types } from 'mongoose';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly alertLogRepository: AlertLogRepository,
    private readonly projectRepository: ProjectRepository,
    @InjectQueue('budget-alerts') private readonly alertQueue: Queue,
  ) {}

  async create(dto: CreateBudgetDto) {
    const tenantId = getTenantId();

    if (dto.scope === BudgetScope.PROJECT) {
      if (!dto.project) {
        throw new BadRequestException('Project ID is required for project scope budgets');
      }

      // Check if project exists
      const proj = await this.projectRepository.findById(dto.project);
      if (!proj) {
        throw new NotFoundException('Linked project not found');
      }

      // Find active organization budget covering this period
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);

      const orgBudget = await this.budgetRepository.findOne({
        scope: BudgetScope.ORGANIZATION,
        status: BudgetStatus.ACTIVE,
        startDate: { $lte: start },
        endDate: { $gte: end },
      });

      if (!orgBudget) {
        throw new BadRequestException(
          'No active organization budget covers this project period. Set up an organization budget first.'
        );
      }

      // Sum other project budgets in this period
      const existingProjectBudgets = await this.budgetRepository.find({
        scope: BudgetScope.PROJECT,
        status: BudgetStatus.ACTIVE,
        startDate: { $gte: orgBudget.startDate },
        endDate: { $lte: orgBudget.endDate },
      });

      const currentAllocated = existingProjectBudgets.reduce((sum, b) => sum + b.amount, 0);

      if (currentAllocated + dto.amount > orgBudget.amount) {
        throw new BadRequestException(
          `Project budget allocation exceeds organization budget ceiling. ` +
          `Available remaining: ${orgBudget.amount - currentAllocated} ${orgBudget.currency}. ` +
          `Requested: ${dto.amount} ${dto.currency || 'USD'}.`
        );
      }
    } else {
      // Organization scope overlap checks
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);

      const overlap = await this.budgetRepository.findOne({
        scope: BudgetScope.ORGANIZATION,
        status: BudgetStatus.ACTIVE,
        $or: [
          { startDate: { $lte: end, $gte: start } },
          { endDate: { $lte: end, $gte: start } },
          { startDate: { $lte: start }, endDate: { $gte: end } },
        ],
      });

      if (overlap) {
        throw new ConflictException('An active organization budget already exists for this overlapping period.');
      }
    }

    return this.budgetRepository.create({
      ...dto,
      project: dto.project ? new Types.ObjectId(dto.project) : undefined,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      organization: tenantId as any,
    });
  }

  async findAll() {
    return this.budgetRepository.find({});
  }

  async findOne(id: string) {
    const budget = await this.budgetRepository.findById(id);
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return budget;
  }

  async update(id: string, dto: UpdateBudgetDto) {
    const budget = await this.findOne(id);
    const tenantId = getTenantId();

    const updateData: any = { ...dto };
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

    if (dto.amount && budget.scope === BudgetScope.PROJECT) {
      // Find org budget
      const orgBudget = await this.budgetRepository.findOne({
        scope: BudgetScope.ORGANIZATION,
        status: BudgetStatus.ACTIVE,
        startDate: { $lte: budget.startDate },
        endDate: { $gte: budget.endDate },
      });

      if (orgBudget) {
        const otherBudgets = await this.budgetRepository.find({
          scope: BudgetScope.PROJECT,
          status: BudgetStatus.ACTIVE,
          _id: { $ne: budget._id },
          startDate: { $gte: orgBudget.startDate },
          endDate: { $lte: orgBudget.endDate },
        });

        const allocated = otherBudgets.reduce((sum, b) => sum + b.amount, 0);
        if (allocated + dto.amount > orgBudget.amount) {
          throw new BadRequestException(
            `Updating budget exceeds organization limit. Max available: ${orgBudget.amount - allocated}`
          );
        }
      }
    }

    return this.budgetRepository.update(id, updateData);
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.budgetRepository.delete(id);
  }

  async updateSpent(id: string, incrementAmount: number) {
    const budget = await this.findOne(id);
    const tenantId = getTenantId();

    const newSpent = budget.spent + incrementAmount;
    const percentage = (newSpent / budget.amount) * 100;

    const alerted = [...budget.alertedThresholds];
    const thresholdsToTrigger = budget.thresholds.filter(
      (t) => percentage >= t && !alerted.includes(t)
    );

    // Push alert jobs to background queue
    for (const t of thresholdsToTrigger) {
      alerted.push(t);
      await this.alertQueue.add(
        'trigger-alert',
        {
          budgetId: budget._id.toString(),
          projectId: budget.project?.toString(),
          threshold: t,
          percentage,
          amount: budget.amount,
          spent: newSpent,
          organizationId: tenantId,
        },
        { removeOnComplete: true }
      );
    }

    return this.budgetRepository.update(id, {
      spent: newSpent,
      alertedThresholds: alerted,
    });
  }

  async getAlertLogs() {
    return this.alertLogRepository.find({});
  }
}
