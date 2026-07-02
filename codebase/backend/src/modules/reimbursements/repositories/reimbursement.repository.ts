import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reimbursement, ReimbursementDocument } from '../schemas/reimbursement.schema';

@Injectable()
export class ReimbursementRepository {
  constructor(
    @InjectModel(Reimbursement.name)
    private readonly model: Model<ReimbursementDocument>,
  ) {}

  async create(data: Partial<Reimbursement>): Promise<ReimbursementDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<ReimbursementDocument | null> {
    return this.model
      .findById(id)
      .setOptions(options)
      .populate({
        path: 'expenses',
        populate: [
          { path: 'employee', select: 'name email employeeId' },
          { path: 'project', select: 'name code' },
          { path: 'category', select: 'name code' },
        ]
      })
      .populate('paymentMethod')
      .populate('createdBy', 'name email')
      .exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<ReimbursementDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<ReimbursementDocument[]> {
    return this.model
      .find(filter)
      .setOptions(options)
      .populate('paymentMethod')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findPaginated(
    filter: Record<string, any> = {},
    options: Record<string, any> = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: ReimbursementDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .setOptions(options)
        .populate('paymentMethod')
        .populate('createdBy', 'name email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).setOptions(options).exec(),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: Partial<Reimbursement>,
    options: Record<string, any> = {},
  ): Promise<ReimbursementDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<ReimbursementDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
