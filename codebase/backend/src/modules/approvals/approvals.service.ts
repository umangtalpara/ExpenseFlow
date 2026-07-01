import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApprovalWorkflowRepository } from './repositories/approval-workflow.repository';
import { ApprovalRequestRepository } from './repositories/approval-request.repository';
import { ExpenseRepository } from '../expenses/repositories/expense.repository';
import { CreateApprovalWorkflowDto, UpdateApprovalWorkflowDto } from './dto/approval-workflow.dto';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { ApprovalWorkflow, WorkflowStatus, ApprovalStep } from './schemas/approval-workflow.schema';
import { ApprovalRequest, ApprovalRequestStatus, ApprovalAction } from './schemas/approval-request.schema';
import { ExpenseStatus } from '../expenses/schemas/expense.schema';
import { getTenantId } from '../../common/tenant/tenant.context';
import { Types } from 'mongoose';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly workflowRepo: ApprovalWorkflowRepository,
    private readonly requestRepo: ApprovalRequestRepository,
    private readonly expenseRepo: ExpenseRepository,
  ) {}

  // --- Workflows CRUD ---

  async createWorkflow(dto: CreateApprovalWorkflowDto) {
    const tenantId = getTenantId();

    this.validateSteps(dto.steps);

    if (dto.isDefault) {
      await this.clearDefaultWorkflows(tenantId);
    }

    return this.workflowRepo.create({
      ...dto,
      organization: tenantId as any,
    });
  }

  async findAllWorkflows() {
    return this.workflowRepo.find({});
  }

  async findOneWorkflow(id: string) {
    const workflow = await this.workflowRepo.findById(id);
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }
    return workflow;
  }

  async updateWorkflow(id: string, dto: UpdateApprovalWorkflowDto) {
    const tenantId = getTenantId();
    const workflow = await this.findOneWorkflow(id);

    if (dto.steps) {
      this.validateSteps(dto.steps);
    }

    if (dto.isDefault) {
      await this.clearDefaultWorkflows(tenantId);
    }

    return this.workflowRepo.update(id, dto);
  }

  async deleteWorkflow(id: string) {
    await this.findOneWorkflow(id);
    return this.workflowRepo.delete(id);
  }

  // --- Matching Engine ---

  async submitToWorkflow(expenseId: string) {
    const tenantId = getTenantId();
    const expense = await this.expenseRepo.findById(expenseId);
    if (!expense) return null;

    const workflows = await this.workflowRepo.find({
      status: WorkflowStatus.ACTIVE,
      organization: tenantId,
    });

    if (workflows.length === 0) {
      // Auto-approve if no workflows exist
      await this.expenseRepo.update(expenseId, { status: ExpenseStatus.APPROVED });
      return null;
    }

    let matchedWorkflow: ApprovalWorkflow | null = null;
    let highestScore = -1;

    for (const wf of workflows) {
      let score = 0;
      let matches = true;

      // Category condition matching
      if (wf.conditions.category) {
        if (expense.category.toString() === wf.conditions.category.toString()) {
          score += 10;
        } else {
          matches = false;
        }
      }

      // Amount conditions matching
      if (wf.conditions.minAmount !== undefined && wf.conditions.minAmount !== null) {
        if (expense.convertedAmount >= wf.conditions.minAmount) {
          score += 5;
        } else {
          matches = false;
        }
      }

      if (wf.conditions.maxAmount !== undefined && wf.conditions.maxAmount !== null) {
        if (expense.convertedAmount <= wf.conditions.maxAmount) {
          score += 5;
        } else {
          matches = false;
        }
      }

      // Default fallback match
      if (wf.isDefault && score === 0) {
        score = 1;
      } else if (score === 0) {
        matches = false;
      }

      if (matches && score > highestScore) {
        highestScore = score;
        matchedWorkflow = wf;
      }
    }

    if (!matchedWorkflow) {
      // Auto-approve if no match found
      await this.expenseRepo.update(expenseId, { status: ExpenseStatus.APPROVED });
      return null;
    }

    // Create ApprovalRequest
    return this.requestRepo.create({
      expense: expense._id,
      workflow: matchedWorkflow as any,
      currentStepNumber: 1,
      status: ApprovalRequestStatus.PENDING,
      history: [],
      organization: tenantId as any,
    });
  }

  // --- Action Processor ---

  async takeAction(requestId: string, userId: string, userRoleId: string, dto: ApprovalActionDto) {
    const request = await this.requestRepo.findById(requestId);
    if (!request) {
      throw new NotFoundException('Approval request not found');
    }

    if (request.status !== ApprovalRequestStatus.PENDING) {
      throw new BadRequestException('This approval workflow has already been finalized');
    }

    const workflow = await this.workflowRepo.findById(request.workflow.toString());
    if (!workflow) {
      throw new NotFoundException('Associated workflow not found');
    }

    const step = workflow.steps.find((s) => s.stepNumber === request.currentStepNumber);
    if (!step) {
      throw new NotFoundException('Current workflow step not found');
    }

    // Verify current approver permission
    const matchesUser = step.approverUser && step.approverUser.toString() === userId;
    const matchesRole = step.approverRole && step.approverRole.toString() === userRoleId;

    if (!matchesUser && !matchesRole) {
      throw new ForbiddenException('You are not authorized to approve this step');
    }

    // Add action to history
    request.history.push({
      stepNumber: request.currentStepNumber,
      approver: new Types.ObjectId(userId) as any,
      action: dto.action,
      actionDate: new Date(),
      comment: dto.comment,
    });

    if (dto.action === ApprovalAction.REJECTED) {
      request.status = ApprovalRequestStatus.REJECTED;
      await this.expenseRepo.update(request.expense.toString(), { status: ExpenseStatus.REJECTED });
    } else {
      // Verify next step exists
      const nextStep = workflow.steps.find((s) => s.stepNumber === request.currentStepNumber + 1);
      if (nextStep) {
        request.currentStepNumber += 1;
      } else {
        request.status = ApprovalRequestStatus.APPROVED;
        await this.expenseRepo.update(request.expense.toString(), { status: ExpenseStatus.APPROVED });
      }
    }

    return this.requestRepo.update(requestId, {
      status: request.status,
      currentStepNumber: request.currentStepNumber,
      history: request.history,
    });
  }

  // --- Approver Inbox & History ---

  async getInbox(userId: string, userRoleId: string) {
    const tenantId = getTenantId();

    // Query workflows to identify steps matching user or userRole
    const workflows = await this.workflowRepo.find({
      status: WorkflowStatus.ACTIVE,
      organization: tenantId,
    });

    const activeRequests = await this.requestRepo.find({
      status: ApprovalRequestStatus.PENDING,
      organization: tenantId,
    });

    const inboxItems: any[] = [];

    for (const req of activeRequests) {
      const wf = workflows.find((w) => w._id.toString() === req.workflow.toString());
      if (!wf) continue;

      const step = wf.steps.find((s) => s.stepNumber === req.currentStepNumber);
      if (!step) continue;

      const isApproverUser = step.approverUser && step.approverUser.toString() === userId;
      const isApproverRole = step.approverRole && step.approverRole.toString() === userRoleId;

      if (isApproverUser || isApproverRole) {
        const populated = await req.populate([
          { path: 'expense', populate: ['category', 'paymentMethod', 'project', 'employee'] },
          'workflow',
        ]);
        inboxItems.push(populated);
      }
    }

    return inboxItems;
  }

  async getAuditHistory() {
    return this.requestRepo.find({});
  }

  // --- Helpers ---

  private validateSteps(steps: ApprovalStep[]) {
    if (!steps || steps.length === 0) {
      throw new BadRequestException('Workflow must contain at least one step');
    }

    // Sort by step number
    const sorted = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);

    // Enforce consecutive unique numbers starting from 1
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].stepNumber !== i + 1) {
        throw new BadRequestException(`Workflow steps must be consecutive integers starting from 1. Step at index ${i} is ${sorted[i].stepNumber}`);
      }
      if (!sorted[i].approverUser && !sorted[i].approverRole) {
        throw new BadRequestException(`Step number ${sorted[i].stepNumber} must have either an approverUser or approverRole assigned`);
      }
    }
  }

  private async clearDefaultWorkflows(organizationId: string) {
    const activeDefaults = await this.workflowRepo.find({
      isDefault: true,
      organization: organizationId,
    });

    for (const wf of activeDefaults) {
      await this.workflowRepo.update(wf._id.toString(), { isDefault: false });
    }
  }
}
