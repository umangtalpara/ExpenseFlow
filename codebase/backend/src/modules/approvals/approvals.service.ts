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
import { UserRepository } from '../users/repositories/user.repository';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RoleRepository } from '../roles/repositories/role.repository';
import { ProjectRepository } from '../projects/repositories/project.repository';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly workflowRepo: ApprovalWorkflowRepository,
    private readonly requestRepo: ApprovalRequestRepository,
    private readonly expenseRepo: ExpenseRepository,
    private readonly userRepository: UserRepository,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly roleRepository: RoleRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  // --- Workflows CRUD ---

  async createWorkflow(dto: CreateApprovalWorkflowDto) {
    const tenantId = getTenantId();

    this.validateSteps(dto.steps as any);

    if (dto.isDefault) {
      await this.clearDefaultWorkflows(tenantId!);
    }

    return this.workflowRepo.create({
      ...dto,
      organization: tenantId as any,
    } as any);
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
      this.validateSteps(dto.steps as any);
    }

    if (dto.isDefault) {
      await this.clearDefaultWorkflows(tenantId!);
    }

    return this.workflowRepo.update(id, dto as any);
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

    if (expense.project) {
      const project = await this.projectRepository.findById(expense.project.toString());
      if (project && project.approvalFlow) {
        const workflow = await this.workflowRepo.findOne({
          _id: project.approvalFlow as any,
          status: WorkflowStatus.ACTIVE,
          organization: tenantId,
        });

        if (workflow) {
          // Create ApprovalRequest
          const request = await this.requestRepo.create({
            expense: expense._id,
            workflow: workflow as any,
            currentStepNumber: 1,
            status: ApprovalRequestStatus.PENDING,
            history: [],
            organization: tenantId as any,
          });

          // Notify first step approver(s)
          const populatedExpense = await expense.populate('employee');
          const firstStep = workflow.steps.find((s) => s.stepNumber === 1);
          if (firstStep) {
            await this.notifyApprovers(firstStep, populatedExpense);
          }

          return request;
        }
      }
    }

    // Auto-approve if no project or no approval flow selected
    await this.expenseRepo.update(expenseId, { status: ExpenseStatus.APPROVED });
    return null;
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

    // Additional check for Project Manager role: they can only approve projects they manage
    const roleDoc = await this.roleRepository.findById(userRoleId);
    const roleName = roleDoc?.name || '';
    if (roleName === 'Project Manager') {
      const expense = await this.expenseRepo.findById(request.expense.toString());
      if (!expense || !expense.project) {
        throw new ForbiddenException('Project Manager cannot approve organization-level expenses');
      }
      const projDoc = await this.projectRepository.findById(expense.project.toString());
      if (!projDoc || !projDoc.projectManagers.some((pmId: any) => pmId.toString() === userId)) {
        throw new ForbiddenException('You are not authorized to approve expenses for this project');
      }
    }

    // Add action to history
    request.history.push({
      stepNumber: request.currentStepNumber,
      approver: new Types.ObjectId(userId) as any,
      action: dto.action,
      actionDate: new Date(),
      comment: dto.comment,
    });

    const populatedExpense = await this.expenseRepo.findById(request.expense.toString()).then(e => e?.populate('employee'));
    const approverUserDoc = await this.userRepository.findById(userId, { bypassTenantIsolation: true });
    const approverName = approverUserDoc?.name || 'Approver';

    if (dto.action === ApprovalAction.REJECTED) {
      request.status = ApprovalRequestStatus.REJECTED;
      await this.expenseRepo.update(request.expense.toString(), { status: ExpenseStatus.REJECTED });

      // Notify submitter of rejection
      if (populatedExpense && populatedExpense.employee) {
        const title = `Expense Claim Rejected`;
        const body = `Your expense claim "${populatedExpense.merchant}" has been Rejected by ${approverName}. Reason: ${dto.comment || 'N/A'}`;
        await this.notificationsService.createNotification(
          (populatedExpense.employee as any)._id.toString(),
          title,
          body,
          'CLAIM_REJECTED',
          {},
          request.organization.toString()
        );
        await this.mailService.sendMail((populatedExpense.employee as any).email, title, `<p>${body}</p>`);
      }
    } else {
      // Verify next step exists
      const nextStep = workflow.steps.find((s) => s.stepNumber === request.currentStepNumber + 1);
      if (nextStep) {
        request.currentStepNumber += 1;
        // Notify next step approver(s)
        if (populatedExpense) {
          await this.notifyApprovers(nextStep, populatedExpense);
        }
      } else {
        request.status = ApprovalRequestStatus.APPROVED;
        await this.expenseRepo.update(request.expense.toString(), { status: ExpenseStatus.APPROVED });

        // Notify submitter of final approval
        if (populatedExpense && populatedExpense.employee) {
          const title = `Expense Claim Approved`;
          const body = `Your expense claim "${populatedExpense.merchant}" has been Approved by ${approverName}.`;
          await this.notificationsService.createNotification(
            (populatedExpense.employee as any)._id.toString(),
            title,
            body,
            'CLAIM_APPROVED',
            {},
            request.organization.toString()
          );
          await this.mailService.sendMail((populatedExpense.employee as any).email, title, `<p>${body}</p>`);
        }
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

    const roleDoc = await this.roleRepository.findById(userRoleId);
    const roleName = roleDoc?.name || '';

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

        if (roleName === 'Project Manager') {
          const expenseProj = (populated.expense as any)?.project;
          if (!expenseProj) {
            continue; // PMs cannot approve organization-level expenses
          }

          const projDoc = await this.projectRepository.findById(expenseProj._id ? expenseProj._id : expenseProj);
          if (!projDoc) {
            continue;
          }

          const isAssigned = projDoc.projectManagers.some(
            (pmId: any) => pmId.toString() === userId
          );
          if (!isAssigned) {
            continue; // Not assigned to this project!
          }
        }

        inboxItems.push(populated);
      }
    }

    return inboxItems;
  }

  async getAuditHistory() {
    return this.requestRepo.find({});
  }

  async cancelPendingRequest(expenseId: string) {
    const request = await this.requestRepo.findOne({
      expense: new Types.ObjectId(expenseId),
      status: ApprovalRequestStatus.PENDING,
    });
    if (request) {
      await this.requestRepo.delete(request._id.toString());
    }
  }

  // --- Helpers ---

  private async notifyApprovers(step: ApprovalStep, expense: any) {
    const tenantId = getTenantId() || expense.organization.toString();
    const title = `Action Required: Expense Claim Approval`;
    const body = `An expense claim of ${expense.amount} ${expense.currency} for "${expense.merchant}" submitted by ${expense.employee?.name || 'Employee'} requires your review.`;

    const approverUserId = (step.approverUser as any)?._id || step.approverUser;
    if (approverUserId) {
      const recipientId = approverUserId.toString();
      const user = await this.userRepository.findById(recipientId, { bypassTenantIsolation: true });
      if (user) {
        await this.notificationsService.createNotification(recipientId, title, body, 'APPROVAL_REQUIRED', {}, tenantId);
        await this.mailService.sendMail(user.email, title, `<p>${body}</p>`);
      }
    } else {
      const approverRoleId = (step.approverRole as any)?._id || step.approverRole;
      if (approverRoleId) {
        const roleId = approverRoleId.toString();
        const usersWithRole = await this.userRepository.find({ role: new Types.ObjectId(roleId) });
        for (const user of usersWithRole) {
          await this.notificationsService.createNotification(user._id.toString(), title, body, 'APPROVAL_REQUIRED', {}, tenantId);
          await this.mailService.sendMail(user.email, title, `<p>${body}</p>`);
        }
      }
    }
  }

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
