import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AlertLog, AlertLogDocument } from '../schemas/alert-log.schema';

@Injectable()
export class AlertLogRepository {
  constructor(
    @InjectModel(AlertLog.name)
    private readonly model: Model<AlertLogDocument>,
  ) {}

  async create(data: Partial<AlertLog>): Promise<AlertLogDocument> {
    return this.model.create(data);
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<AlertLogDocument[]> {
    return this.model.find(filter).sort({ createdAt: -1 }).setOptions(options).exec();
  }

  async deleteMany(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<any> {
    return this.model.deleteMany(filter).setOptions(options).exec();
  }
}
