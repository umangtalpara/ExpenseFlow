import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Vendor, VendorDocument } from '../vendors/schemas/vendor.schema';
import { Budget, BudgetDocument } from '../budgets/schemas/budget.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<VendorDocument>,
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<BudgetDocument>,
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  async getDashboardMetrics(userId: string, tenantId: string) {
    const userDoc = await this.userModel.findById(userId).exec();
    if (!userDoc) {
      throw new Error('User not found');
    }

    const roleDoc = await this.roleModel.findById(userDoc.role).exec();
    const roleName = roleDoc?.name || 'Employee';

    const isAdmin = roleName === 'Organization Admin' || roleName.includes('Admin');
    const isPM = roleName === 'Project Manager';

    let projectIdsFilter: Types.ObjectId[] | null = null;

    if (isPM) {
      // Find projects managed by this user
      const managedProjects = await this.projectModel
        .find({ organization: new Types.ObjectId(tenantId), managers: new Types.ObjectId(userId) })
        .exec();
      projectIdsFilter = managedProjects.map((p) => p._id as Types.ObjectId);
    }

    // Base query filters for expenses
    const matchFilter: any = { organization: new Types.ObjectId(tenantId) };
    if (isPM) {
      matchFilter.project = { $in: projectIdsFilter || [] };
    } else if (!isAdmin) {
      // Employee filter
      matchFilter.employee = new Types.ObjectId(userId);
    }

    // Date calculations for current month
    const startOfCurrentMonth = new Date();
    startOfCurrentMonth.setDate(1);
    startOfCurrentMonth.setHours(0, 0, 0, 0);

    const endOfCurrentMonth = new Date();
    endOfCurrentMonth.setMonth(endOfCurrentMonth.getMonth() + 1);
    endOfCurrentMonth.setDate(0);
    endOfCurrentMonth.setHours(23, 59, 59, 999);

    // 1. Total expenses (approved & reimbursed)
    const approvedStatuses = ['approved', 'reimbursed'];
    const totalExpensesRes = await this.expenseModel.aggregate([
      { $match: { ...matchFilter, status: { $in: approvedStatuses } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$convertedAmount', '$amount'] } } } },
    ]);
    const totalExpenses = totalExpensesRes[0]?.total || 0;

    // 2. Current Month expenses (approved & reimbursed)
    const monthlyExpensesRes = await this.expenseModel.aggregate([
      {
        $match: {
          ...matchFilter,
          status: { $in: approvedStatuses },
          date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth },
        },
      },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$convertedAmount', '$amount'] } } } },
    ]);
    const monthlyExpenses = monthlyExpensesRes[0]?.total || 0;

    // 3. Status aggregations (Pending, Approved, Rejected)
    const statusCounts = await this.expenseModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: { $ifNull: ['$convertedAmount', '$amount'] } },
        },
      },
    ]);

    const getStatusData = (status: string) => {
      const found = statusCounts.find((s) => s._id === status);
      return {
        count: found?.count || 0,
        amount: found?.amount || 0,
      };
    };

    const pendingData = getStatusData('submitted');
    const approvedData = getStatusData('approved');
    const rejectedData = getStatusData('rejected');

    // 4. Entity counts & Budgets
    let activeProjects = 0;
    let activeEmployees = 0;
    let activeVendors = 0;
    let budgetUsed = 0;
    let budgetRemaining = 0;

    if (isAdmin) {
      activeProjects = await this.projectModel.countDocuments({ organization: new Types.ObjectId(tenantId) }).exec();
      activeEmployees = await this.userModel.countDocuments({ organization: new Types.ObjectId(tenantId) }).exec();
      activeVendors = await this.vendorModel.countDocuments({ organization: new Types.ObjectId(tenantId) }).exec();

      const budgets = await this.budgetModel.find({ organization: new Types.ObjectId(tenantId) }).exec();
      budgetUsed = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
      budgetRemaining = budgets.reduce((sum, b) => sum + Math.max(0, (b.amount || 0) - (b.spent || 0)), 0);
    } else if (isPM) {
      activeProjects = projectIdsFilter?.length || 0;
      activeVendors = await this.vendorModel.countDocuments({
        organization: new Types.ObjectId(tenantId),
        projects: { $in: projectIdsFilter || [] },
      }).exec();

      // Find employees working on these projects
      const pmProjects = await this.projectModel
        .find({ _id: { $in: projectIdsFilter || [] } })
        .populate('employees', '_id')
        .exec();
      const empIds = new Set<string>();
      for (const p of pmProjects) {
        for (const e of p.employees as any[]) {
          empIds.add(e._id.toString());
        }
      }
      activeEmployees = empIds.size;

      // Budgets for managed projects
      const budgets = await this.budgetModel
        .find({ organization: new Types.ObjectId(tenantId), project: { $in: projectIdsFilter || [] } })
        .exec();
      budgetUsed = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
      budgetRemaining = budgets.reduce((sum, b) => sum + Math.max(0, (b.amount || 0) - (b.spent || 0)), 0);
    }

    // Employee specific payout metrics (total paid reimbursements)
    let totalReimbursement = 0;
    if (!isAdmin && !isPM) {
      const reimbursedRes = await this.expenseModel.aggregate([
        { $match: { ...matchFilter, status: 'reimbursed' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$convertedAmount', '$amount'] } } } },
      ]);
      totalReimbursement = reimbursedRes[0]?.total || 0;
    }

    // 5. Monthly trend (past 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyTrendAgg = await this.expenseModel.aggregate([
      {
        $match: {
          ...matchFilter,
          status: { $in: approvedStatuses },
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          amount: { $sum: { $ifNull: ['$convertedAmount', '$amount'] } },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      trendMap.set(key, 0);
    }

    monthlyTrendAgg.forEach((item) => {
      const monthIdx = item._id.month - 1;
      const key = `${monthNames[monthIdx]} ${item._id.year}`;
      if (trendMap.has(key)) {
        trendMap.set(key, item.amount);
      }
    });

    const monthlySpending = Array.from(trendMap.entries()).map(([month, amount]) => ({
      month,
      amount,
    }));

    // 6. Category Spending
    const categorySpending = await this.expenseModel.aggregate([
      { $match: { ...matchFilter, status: { $in: approvedStatuses } } },
      { $group: { _id: '$category', amount: { $sum: { $ifNull: ['$convertedAmount', '$amount'] } } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'catInfo' } },
      { $unwind: { path: '$catInfo', preserveNullAndEmptyArrays: true } },
      { $project: { category: { $ifNull: ['$catInfo.name', 'Uncategorized'] }, amount: 1, _id: 0 } },
      { $sort: { amount: -1 } },
    ]);

    // 7. Project Spending
    const projectSpending = await this.expenseModel.aggregate([
      { $match: { ...matchFilter, status: { $in: approvedStatuses } } },
      { $group: { _id: '$project', amount: { $sum: { $ifNull: ['$convertedAmount', '$amount'] } } } },
      { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'projInfo' } },
      { $unwind: { path: '$projInfo', preserveNullAndEmptyArrays: true } },
      { $project: { project: { $ifNull: ['$projInfo.name', 'Organization Wide'] }, amount: 1, _id: 0 } },
      { $sort: { amount: -1 } },
    ]);

    // 8. Department Spending
    const departmentSpending = await this.expenseModel.aggregate([
      { $match: { ...matchFilter, status: { $in: approvedStatuses } } },
      { $lookup: { from: 'users', localField: 'employee', foreignField: '_id', as: 'empInfo' } },
      { $unwind: { path: '$empInfo', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$empInfo.department', 'No Department'] }, amount: { $sum: { $ifNull: ['$convertedAmount', '$amount'] } } } },
      { $project: { department: '$_id', amount: 1, _id: 0 } },
      { $sort: { amount: -1 } },
    ]);

    // 9. Vendor Spending
    const vendorSpending = await this.expenseModel.aggregate([
      { $match: { ...matchFilter, status: { $in: approvedStatuses } } },
      { $group: { _id: '$vendor', amount: { $sum: { $ifNull: ['$convertedAmount', '$amount'] } } } },
      { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendInfo' } },
      { $unwind: { path: '$vendInfo', preserveNullAndEmptyArrays: true } },
      { $project: { vendor: { $ifNull: ['$vendInfo.name', 'No Vendor'] }, amount: 1, _id: 0 } },
      { $sort: { amount: -1 } },
    ]);

    // 10. Payment Method Spending
    const paymentMethodSpending = await this.expenseModel.aggregate([
      { $match: { ...matchFilter, status: { $in: approvedStatuses } } },
      { $group: { _id: '$paymentMethod', amount: { $sum: { $ifNull: ['$convertedAmount', '$amount'] } } } },
      { $lookup: { from: 'payment_methods', localField: '_id', foreignField: '_id', as: 'pmInfo' } },
      { $unwind: { path: '$pmInfo', preserveNullAndEmptyArrays: true } },
      { $project: { paymentMethod: { $ifNull: ['$pmInfo.name', 'Direct Cash'] }, amount: 1, _id: 0 } },
      { $sort: { amount: -1 } },
    ]);

    return {
      cards: {
        totalExpenses,
        monthlyExpenses,
        pendingCount: pendingData.count,
        pendingAmount: pendingData.amount,
        approvedCount: approvedData.count,
        approvedAmount: approvedData.amount,
        rejectedCount: rejectedData.count,
        rejectedAmount: rejectedData.amount,
        budgetUsed,
        budgetRemaining,
        activeProjects,
        activeEmployees,
        activeVendors,
        totalReimbursement,
      },
      charts: {
        monthlySpending,
        categorySpending,
        projectSpending,
        departmentSpending,
        vendorSpending,
        paymentMethodSpending,
      },
    };
  }
}
