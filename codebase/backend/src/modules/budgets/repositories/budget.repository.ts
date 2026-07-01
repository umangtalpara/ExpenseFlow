import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Budget, BudgetDocument } from '../schemas/budget.schema';

@Injectable()
export class BudgetRepository {
  constructor(
    @InjectModel(Budget.name)
    private readonly model: Model<BudgetDocument>,
  ) {}

  async create(data: Partial<Budget>): Promise<BudgetDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<BudgetDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<BudgetDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<BudgetDocument[]> {
    return this.model.find(filter).setOptions(options).exec();
  }

  async update(id: string, data: Partial<Budget>, options: Record<string, any> = {}): Promise<BudgetDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<BudgetDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
