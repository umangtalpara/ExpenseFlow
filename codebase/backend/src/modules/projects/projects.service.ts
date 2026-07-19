import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProjectRepository } from './repositories/project.repository';
import { UserRepository } from '../users/repositories/user.repository';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { getTenantId } from '../../common/tenant/tenant.context';
import { Types, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userRepository: UserRepository,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(dto: CreateProjectDto) {
    const tenantId = getTenantId();

    if (dto.budget === undefined || dto.budget === null || dto.budget <= 0) {
      throw new BadRequestException('Project budget is compulsory and must be greater than 0');
    }

    // Lock currency to organization currency
    const OrgModel = this.connection.model('Organization');
    const org = await OrgModel.findById(tenantId).exec();
    const orgCurrency = org?.currency || 'USD';
    const projectCurrency = orgCurrency; // Locked!

    const existingName = await this.projectRepository.findOne({
      name: dto.name,
    });
    if (existingName) {
      throw new ConflictException('Project with this name already exists');
    }

    const existingCode = await this.projectRepository.findOne({
      code: dto.code.toUpperCase(),
    });
    if (existingCode) {
      throw new ConflictException('Project with this code already exists');
    }

    // Organization Budget Limit Verification
    const start = dto.startDate ? new Date(dto.startDate) : new Date();
    const end = dto.endDate ? new Date(dto.endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const BudgetModel = this.connection.model('Budget');
    const orgBudget = await BudgetModel.findOne({
      scope: 'organization',
      status: 'active',
      startDate: { $lte: start },
      endDate: { $gte: end },
      organization: new Types.ObjectId(tenantId),
    }).exec();

    if (!orgBudget) {
      if (!dto.bypassBudgetLimit) {
        throw new BadRequestException(
          'No active organization budget covers this project period. Set up an organization budget first.'
        );
      }
    } else {
      // Sum other project budgets in this period
      const existingProjectBudgets = await BudgetModel.find({
        scope: 'project',
        status: 'active',
        organization: new Types.ObjectId(tenantId),
        startDate: { $gte: orgBudget.startDate },
        endDate: { $lte: orgBudget.endDate },
      }).exec();

      const currentAllocated = existingProjectBudgets.reduce((sum, b: any) => sum + b.amount, 0);

      if (currentAllocated + dto.budget > orgBudget.amount) {
        if (!dto.bypassBudgetLimit) {
          throw new BadRequestException(
            `Project budget allocation exceeds organization budget ceiling. ` +
            `Available remaining: ${orgBudget.amount - currentAllocated} ${orgBudget.currency}. ` +
            `Requested: ${dto.budget} ${projectCurrency}.`
          );
        }
      }
    }

    if (dto.approvalFlow) {
      const ApprovalWorkflowModel = this.connection.model('ApprovalWorkflow');
      const workflow = await ApprovalWorkflowModel.findOne({
        _id: new Types.ObjectId(dto.approvalFlow),
        organization: new Types.ObjectId(tenantId),
      }).exec();
      if (!workflow) {
        throw new BadRequestException('Invalid approval workflow selected');
      }
    }

    // Create project
    const project = await this.projectRepository.create({
      ...dto,
      currency: projectCurrency,
      code: dto.code.toUpperCase(),
      startDate: start,
      endDate: end,
      organization: tenantId as any,
    });

    // Auto-create active project-scoped budget and expense alerting
    await BudgetModel.create({
      scope: 'project',
      project: project._id,
      amount: dto.budget,
      currency: projectCurrency,
      startDate: start,
      endDate: end,
      status: 'active',
      spent: 0,
      thresholds: [80, 90, 100],
      alertedThresholds: [],
      organization: tenantId as any,
    });

    return project;
  }

  private async getSpentAmount(projectId: string): Promise<number> {
    try {
      const ExpenseModel = this.connection.model('Expense');
      const result = await ExpenseModel.aggregate([
        {
          $match: {
            project: new Types.ObjectId(projectId),
            status: { $in: ['submitted', 'approved', 'reimbursed'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$convertedAmount' },
          },
        },
      ]);
      return result[0]?.total || 0;
    } catch (err) {
      return 0;
    }
  }

  async findAll() {
    const projects = await this.projectRepository.find({});
    const enriched = [];
    for (const project of projects) {
      const spent = await this.getSpentAmount(project._id.toString());
      enriched.push({
        ...project.toObject(),
        spent,
      });
    }
    return enriched;
  }

  async findMine(userId: string) {
    const { Types } = await import('mongoose');
    const oid = new Types.ObjectId(userId);
    const projects = await this.projectRepository.find({
      $or: [{ employees: oid }, { projectManagers: oid }],
    });
    const enriched = [];
    for (const project of projects) {
      const spent = await this.getSpentAmount(project._id.toString());
      enriched.push({
        ...project.toObject(),
        spent,
      });
    }
    return enriched;
  }

  async findOne(id: string) {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const populated = await project.populate(['projectManagers', 'employees', 'approvalFlow']);
    return populated;
  }

  async update(id: string, dto: UpdateProjectDto) {
    const project = await this.findOne(id);

    if (dto.name && dto.name !== project.name) {
      const existingName = await this.projectRepository.findOne({ name: dto.name });
      if (existingName) {
        throw new ConflictException('Project with this name already exists');
      }
    }

    if (dto.code && dto.code.toUpperCase() !== project.code) {
      const existingCode = await this.projectRepository.findOne({ code: dto.code.toUpperCase() });
      if (existingCode) {
        throw new ConflictException('Project with this code already exists');
      }
    }

    const updateData: any = { ...dto };
    delete updateData.currency; // Currency cannot be updated!
    if (dto.code) updateData.code = dto.code.toUpperCase();
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

    if (dto.approvalFlow) {
      const ApprovalWorkflowModel = this.connection.model('ApprovalWorkflow');
      const workflow = await ApprovalWorkflowModel.findOne({
        _id: new Types.ObjectId(dto.approvalFlow),
        organization: project.organization as any,
      }).exec();
      if (!workflow) {
        throw new BadRequestException('Invalid approval workflow selected');
      }
      updateData.approvalFlow = new Types.ObjectId(dto.approvalFlow);
    } else if (dto.approvalFlow === null || dto.approvalFlow === '') {
      updateData.approvalFlow = null;
    }

    if (dto.budget !== undefined && dto.budget !== null) {
      const BudgetModel = this.connection.model('Budget');
      const budgetDoc = await BudgetModel.findOne({
        scope: 'project',
        project: project._id,
        status: 'active',
      }).exec();
      if (budgetDoc) {
        const orgBudget = await BudgetModel.findOne({
          scope: 'organization',
          status: 'active',
          startDate: { $lte: budgetDoc.startDate },
          endDate: { $gte: budgetDoc.endDate },
        }).exec();

        if (orgBudget) {
          const otherBudgets = await BudgetModel.find({
            scope: 'project',
            status: 'active',
            _id: { $ne: budgetDoc._id },
            startDate: { $gte: orgBudget.startDate },
            endDate: { $lte: orgBudget.endDate },
          }).exec();

          const allocated = otherBudgets.reduce((sum, b: any) => sum + b.amount, 0);
          if (allocated + dto.budget > orgBudget.amount) {
            if (!dto.bypassBudgetLimit) {
              throw new BadRequestException(
                `Updating budget exceeds organization limit. Max available: ${orgBudget.amount - allocated}`
              );
            }
          }
        }
        await BudgetModel.findByIdAndUpdate(budgetDoc._id, { amount: dto.budget }).exec();
      }
    }

    return this.projectRepository.update(id, updateData);
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.projectRepository.delete(id);
  }

  async assignMembers(id: string, userIds: string[]) {
    await this.findOne(id);

    const objectIds: Types.ObjectId[] = [];
    for (const userId of userIds) {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      objectIds.push(new Types.ObjectId(userId));
    }

    return this.projectRepository.update(id, { employees: objectIds });
  }

  async assignManagers(id: string, userIds: string[]) {
    await this.findOne(id);

    const objectIds: Types.ObjectId[] = [];
    for (const userId of userIds) {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      objectIds.push(new Types.ObjectId(userId));
    }

    return this.projectRepository.update(id, { projectManagers: objectIds });
  }
}
