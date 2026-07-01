import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApprovalRequest, ApprovalRequestDocument } from '../schemas/approval-request.schema';

@Injectable()
export class ApprovalRequestRepository {
  constructor(
    @InjectModel(ApprovalRequest.name)
    private readonly model: Model<ApprovalRequestDocument>,
  ) {}

  async create(data: Partial<ApprovalRequest>): Promise<ApprovalRequestDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<ApprovalRequestDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<ApprovalRequestDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<ApprovalRequestDocument[]> {
    return this.model.find(filter).setOptions(options).exec();
  }

  async update(id: string, data: Partial<ApprovalRequest>, options: Record<string, any> = {}): Promise<ApprovalRequestDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<ApprovalRequestDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
