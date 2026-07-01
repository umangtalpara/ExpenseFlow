import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentMethod, PaymentMethodDocument } from '../schemas/payment-method.schema';

@Injectable()
export class PaymentMethodRepository {
  constructor(
    @InjectModel(PaymentMethod.name)
    private readonly model: Model<PaymentMethodDocument>,
  ) {}

  async create(data: Partial<PaymentMethod>): Promise<PaymentMethodDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<PaymentMethodDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<PaymentMethodDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<PaymentMethodDocument[]> {
    return this.model.find(filter).setOptions(options).exec();
  }

  async update(id: string, data: Partial<PaymentMethod>, options: Record<string, any> = {}): Promise<PaymentMethodDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<PaymentMethodDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
