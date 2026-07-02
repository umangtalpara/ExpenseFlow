import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { ExpenseRepository } from './repositories/expense.repository';
import { CategoryRepository } from '../categories/repositories/category.repository';
import { PaymentMethodRepository } from '../payment-methods/repositories/payment-method.repository';
import { ProjectRepository } from '../projects/repositories/project.repository';
import { OrganizationRepository } from '../organizations/repositories/organization.repository';
import { BudgetRepository } from '../budgets/repositories/budget.repository';
import { BudgetsService } from '../budgets/budgets.service';
import { CurrencyExchangeAdapter } from './adapters/currency-exchange.adapter';
import { ApprovalsService } from '../approvals/approvals.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { ExpenseStatus, Expense } from './schemas/expense.schema';
import { CategoryStatus } from '../categories/schemas/category.schema';
import { PaymentMethodStatus } from '../payment-methods/schemas/payment-method.schema';
import { BudgetScope, BudgetStatus } from '../budgets/schemas/budget.schema';
import { getTenantId } from '../../common/tenant/tenant.context';
import { Types } from 'mongoose';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly budgetRepository: BudgetRepository,
    private readonly budgetsService: BudgetsService,
    private readonly exchangeAdapter: CurrencyExchangeAdapter,
    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvalsService: ApprovalsService,
  ) {}

  async create(userId: string, dto: CreateExpenseDto) {
    const tenantId = getTenantId();

    // 1. Verify Category
    const category = await this.categoryRepository.findById(dto.category);
    if (!category || category.status !== CategoryStatus.ACTIVE) {
      throw new BadRequestException('Invalid or inactive category selected');
    }

    // 2. Verify Payment Method
    const pm = await this.paymentMethodRepository.findById(dto.paymentMethod);
    if (!pm || pm.status !== PaymentMethodStatus.ACTIVE) {
      throw new BadRequestException('Invalid or inactive payment method selected');
    }

    // 3. Verify Project if provided
    if (dto.project) {
      const proj = await this.projectRepository.findById(dto.project);
      if (!proj) {
        throw new BadRequestException('Invalid project selected');
      }
    }

    // 4. Resolve exchange rate and converted amount
    const org = await this.organizationRepository.findById(tenantId!);
    const orgCurrency = org?.currency || 'USD';
    const { exchangeRate, convertedAmount } = this.exchangeAdapter.convert(
      dto.amount,
      dto.currency,
      orgCurrency
    );

    // Validate Category limit (maxLimit) in base currency
    if (category.maxLimit !== undefined && category.maxLimit !== null) {
      if (convertedAmount > category.maxLimit) {
        throw new BadRequestException(
          `Expense amount exceeds the category maximum limit of ${category.maxLimit} ${orgCurrency}`
        );
      }
    }

    // Validate Category receipt requirement
    const status = dto.status || ExpenseStatus.DRAFT;
    if (status === ExpenseStatus.SUBMITTED && category.requireReceipt) {
      if (!dto.receiptUrl) {
        throw new BadRequestException('Receipt attachment is required for this category');
      }
    }

    const expense = await this.expenseRepository.create({
      ...dto,
      exchangeRate,
      convertedAmount,
      date: new Date(dto.date),
      category: new Types.ObjectId(dto.category),
      paymentMethod: new Types.ObjectId(dto.paymentMethod),
      project: dto.project ? new Types.ObjectId(dto.project) : undefined,
      employee: new Types.ObjectId(userId),
      organization: tenantId as any,
    });

    // 5. If status is submitted, update project budget spent dynamically and submit to approval workflow
    if (expense.status === ExpenseStatus.SUBMITTED) {
      if (dto.project) {
        await this.triggerBudgetUpdate(dto.project, convertedAmount);
      }
      await this.approvalsService.submitToWorkflow(expense._id.toString());
    }

    return expense;
  }

  async findAll(query?: { employeeId?: string; projectId?: string; status?: string }) {
    const filter: Record<string, any> = {};
    if (query?.employeeId) {
      filter.employee = new Types.ObjectId(query.employeeId);
    }
    if (query?.projectId) {
      filter.project = new Types.ObjectId(query.projectId);
    }
    if (query?.status) {
      filter.status = query.status;
    }
    return this.expenseRepository.find(filter);
  }

  async findOne(id: string) {
    const expense = await this.expenseRepository.findById(id);
    if (!expense) {
      throw new NotFoundException('Expense claim not found');
    }
    const populated = await expense.populate(['category', 'paymentMethod', 'project', 'employee']);
    return populated;
  }

  async update(id: string, userId: string, userRole: string, dto: UpdateExpenseDto) {
    const expense = await this.expenseRepository.findById(id);
    if (!expense) {
      throw new NotFoundException('Expense claim not found');
    }

    // Standard employee can only edit their own draft claims
    const isAdmin = userRole === 'Administrator' || userRole === 'Organization Admin' || userRole.includes('Admin');
    if (expense.employee.toString() !== userId && !isAdmin) {
      throw new ForbiddenException('You do not have permission to edit this claim');
    }

    if (expense.status !== ExpenseStatus.DRAFT && !isAdmin) {
      throw new BadRequestException('Only draft expense claims can be updated');
    }

    // Verify metadata if updated
    let category = await this.categoryRepository.findById(expense.category.toString());
    if (dto.category) {
      const cat = await this.categoryRepository.findById(dto.category);
      if (!cat || cat.status !== CategoryStatus.ACTIVE) {
        throw new BadRequestException('Invalid or inactive category');
      }
      category = cat;
    }
    if (dto.paymentMethod) {
      const pm = await this.paymentMethodRepository.findById(dto.paymentMethod);
      if (!pm || pm.status !== PaymentMethodStatus.ACTIVE) {
        throw new BadRequestException('Invalid or inactive payment method');
      }
    }

    const updateData: any = { ...dto };
    if (dto.date) updateData.date = new Date(dto.date);

    // Re-calculate conversion if amount or currency is changing
    if (dto.amount || dto.currency) {
      const amount = dto.amount ?? expense.amount;
      const currency = dto.currency ?? expense.currency;
      const org = await this.organizationRepository.findById(expense.organization.toString());
      const orgCurrency = org?.currency || 'USD';
      
      const { exchangeRate, convertedAmount } = this.exchangeAdapter.convert(
        amount,
        currency,
        orgCurrency
      );
      updateData.exchangeRate = exchangeRate;
      updateData.convertedAmount = convertedAmount;
    }

    const finalConvertedAmount = updateData.convertedAmount ?? expense.convertedAmount;
    const finalStatus = updateData.status ?? expense.status;
    const finalReceiptUrl = updateData.receiptUrl ?? expense.receiptUrl;

    const org = await this.organizationRepository.findById(expense.organization.toString());
    const orgCurrency = org?.currency || 'USD';

    // Limit check
    if (category && category.maxLimit !== undefined && category.maxLimit !== null) {
      if (finalConvertedAmount > category.maxLimit) {
        throw new BadRequestException(
          `Expense amount exceeds the category maximum limit of ${category.maxLimit} ${orgCurrency}`
        );
      }
    }

    // Receipt check
    if (finalStatus === ExpenseStatus.SUBMITTED && category && category.requireReceipt) {
      if (!finalReceiptUrl) {
        throw new BadRequestException('Receipt attachment is required for this category');
      }
    }

    const updated = await this.expenseRepository.update(id, updateData);

    // If transitioned to submitted, trigger budget update and submit to approval workflow
    if (expense.status === ExpenseStatus.DRAFT && updated!.status === ExpenseStatus.SUBMITTED) {
      if (updated!.project) {
        await this.triggerBudgetUpdate(updated!.project.toString(), updated!.convertedAmount);
      }
      await this.approvalsService.submitToWorkflow(updated!._id.toString());
    }

    return updated;
  }

  async delete(id: string, userId: string) {
    const expense = await this.expenseRepository.findById(id);
    if (!expense) {
      throw new NotFoundException('Expense claim not found');
    }

    if (expense.employee.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to delete this claim');
    }

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestException('Only draft expense claims can be deleted');
    }

    return this.expenseRepository.delete(id);
  }

  private async triggerBudgetUpdate(projectId: string, amount: number) {
    const budget = await this.budgetRepository.findOne({
      scope: BudgetScope.PROJECT,
      project: new Types.ObjectId(projectId),
      status: BudgetStatus.ACTIVE,
    });

    if (budget) {
      await this.budgetsService.updateSpent(budget._id.toString(), amount);
    }
  }
}
