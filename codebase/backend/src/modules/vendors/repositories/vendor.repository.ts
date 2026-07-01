import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vendor, VendorDocument } from '../schemas/vendor.schema';

@Injectable()
export class VendorRepository {
  constructor(
    @InjectModel(Vendor.name)
    private readonly model: Model<VendorDocument>,
  ) {}

  async create(data: Partial<Vendor>): Promise<VendorDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<VendorDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<VendorDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<VendorDocument[]> {
    return this.model.find(filter).setOptions(options).exec();
  }

  async update(id: string, data: Partial<Vendor>, options: Record<string, any> = {}): Promise<VendorDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<VendorDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
