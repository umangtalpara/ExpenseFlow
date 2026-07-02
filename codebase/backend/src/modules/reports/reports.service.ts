import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';

export class ReportFilters {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  employeeId?: string;
  vendorId?: string;
  category?: string;
  paymentMethod?: string;
  status?: string;
  minAmount?: string;
  maxAmount?: string;
  page?: string;
  limit?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  private buildQuery(filters: ReportFilters, tenantId: string): any {
    const query: any = { organization: new Types.ObjectId(tenantId) };

    // Date Range
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.date.$lte = new Date(filters.endDate);
      }
    }

    // Entity IDs
    if (filters.projectId) {
      query.project = new Types.ObjectId(filters.projectId);
    }
    if (filters.employeeId) {
      query.employee = new Types.ObjectId(filters.employeeId);
    }
    if (filters.vendorId) {
      query.vendor = new Types.ObjectId(filters.vendorId);
    }
    if (filters.category) {
      query.category = new Types.ObjectId(filters.category);
    }
    if (filters.paymentMethod) {
      query.paymentMethod = new Types.ObjectId(filters.paymentMethod);
    }

    // Status
    if (filters.status) {
      query.status = filters.status;
    }

    // Amount Range
    if (filters.minAmount || filters.maxAmount) {
      query.amount = {};
      if (filters.minAmount) {
        query.amount.$gte = Number(filters.minAmount);
      }
      if (filters.maxAmount) {
        query.amount.$lte = Number(filters.maxAmount);
      }
    }

    return query;
  }

  async getReportData(filters: ReportFilters, tenantId: string) {
    const query = this.buildQuery(filters, tenantId);

    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await this.expenseModel.countDocuments(query).exec();
    const data = await this.expenseModel
      .find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('employee', 'name email')
      .populate('project', 'name code')
      .populate('vendor', 'name company')
      .populate('category', 'name code')
      .populate('paymentMethod', 'name code')
      .exec();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async exportToCsv(filters: ReportFilters, tenantId: string): Promise<string> {
    const query = this.buildQuery(filters, tenantId);

    const expenses = await this.expenseModel
      .find(query)
      .sort({ date: -1 })
      .populate('employee', 'name email')
      .populate('project', 'name code')
      .populate('vendor', 'name company')
      .populate('category', 'name code')
      .populate('paymentMethod', 'name code')
      .exec();

    const headers = [
      'Date',
      'Expense Title',
      'Merchant',
      'Employee Name',
      'Employee Email',
      'Project Name',
      'Project Code',
      'Category',
      'Payment Method',
      'Amount',
      'Currency',
      'Converted Amount (INR)',
      'Status',
      'GST/VAT',
      'Notes',
    ];

    const rows = expenses.map((exp: any) => {
      const dateStr = exp.date ? new Date(exp.date).toISOString().split('T')[0] : '';
      const title = this.escapeCsvValue(exp.title || '');
      const merchant = this.escapeCsvValue(exp.merchant || '');
      const empName = this.escapeCsvValue(exp.employee?.name || '');
      const empEmail = this.escapeCsvValue(exp.employee?.email || '');
      const projName = this.escapeCsvValue(exp.project?.name || '');
      const projCode = this.escapeCsvValue(exp.project?.code || '');
      const catName = this.escapeCsvValue(exp.category?.name || '');
      const pmName = this.escapeCsvValue(exp.paymentMethod?.name || '');
      const amount = exp.amount || 0;
      const currency = exp.currency || 'INR';
      const convAmount = exp.convertedAmount || amount;
      const status = exp.status || 'pending';
      const gst = this.escapeCsvValue(exp.gstPan || '');
      const notes = this.escapeCsvValue(exp.notes || '');

      return [
        dateStr,
        title,
        merchant,
        empName,
        empEmail,
        projName,
        projCode,
        catName,
        pmName,
        amount,
        currency,
        convAmount,
        status,
        gst,
        notes,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  private escapeCsvValue(val: string): string {
    if (val === null || val === undefined) {
      return '';
    }
    let str = String(val);
    // Escape double quotes and enclose value in quotes if it contains comma, newline or quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    }
    return str;
  }
}
