import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';

@Injectable()
export class ExpenseRepository {
  constructor(
    @InjectModel(Expense.name)
    private readonly model: Model<ExpenseDocument>,
  ) {}

  async create(data: Partial<Expense>): Promise<ExpenseDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<ExpenseDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<ExpenseDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<ExpenseDocument[]> {
    let query = this.model.find(filter).sort({ date: -1 });
    if (options.populate) {
      query = query.populate(options.populate);
    }
    return query.setOptions(options).exec();
  }

  async update(id: string, data: Partial<Expense>, options: Record<string, any> = {}): Promise<ExpenseDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<ExpenseDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
