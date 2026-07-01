import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApprovalWorkflow, ApprovalWorkflowDocument } from '../schemas/approval-workflow.schema';

@Injectable()
export class ApprovalWorkflowRepository {
  constructor(
    @InjectModel(ApprovalWorkflow.name)
    private readonly model: Model<ApprovalWorkflowDocument>,
  ) {}

  async create(data: Partial<ApprovalWorkflow>): Promise<ApprovalWorkflowDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<ApprovalWorkflowDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<ApprovalWorkflowDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<ApprovalWorkflowDocument[]> {
    return this.model.find(filter).setOptions(options).exec();
  }

  async update(id: string, data: Partial<ApprovalWorkflow>, options: Record<string, any> = {}): Promise<ApprovalWorkflowDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<ApprovalWorkflowDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
