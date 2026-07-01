import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Designation, DesignationDocument } from '../schemas/designation.schema';

@Injectable()
export class DesignationRepository {
  constructor(
    @InjectModel(Designation.name)
    private readonly model: Model<DesignationDocument>,
  ) {}

  async create(data: Partial<Designation>): Promise<DesignationDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<DesignationDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<DesignationDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<DesignationDocument[]> {
    return this.model.find(filter).setOptions(options).exec();
  }

  async update(id: string, data: Partial<Designation>, options: Record<string, any> = {}): Promise<DesignationDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<DesignationDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
