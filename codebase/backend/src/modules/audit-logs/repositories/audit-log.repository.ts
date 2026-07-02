import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly model: Model<AuditLogDocument>,
  ) {}

  async create(data: Partial<AuditLog>): Promise<AuditLogDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<AuditLogDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<AuditLogDocument[]> {
    return this.model.find(filter).setOptions(options).exec();
  }

  async findPaginated(
    filter: Record<string, any> = {},
    options: Record<string, any> = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: AuditLogDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .setOptions(options)
        .populate('user', 'name email employeeId')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).setOptions(options).exec(),
    ]);

    return { data, total };
  }
}
