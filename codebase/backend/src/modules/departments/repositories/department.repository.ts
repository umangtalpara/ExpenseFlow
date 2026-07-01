import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department, DepartmentDocument } from '../schemas/department.schema';

@Injectable()
export class DepartmentRepository {
  constructor(
    @InjectModel(Department.name)
    private readonly model: Model<DepartmentDocument>,
  ) {}

  async create(data: Partial<Department>): Promise<DepartmentDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<DepartmentDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<DepartmentDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<DepartmentDocument[]> {
    return this.model.find(filter).setOptions(options).exec();
  }

  async update(id: string, data: Partial<Department>, options: Record<string, any> = {}): Promise<DepartmentDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<DepartmentDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
