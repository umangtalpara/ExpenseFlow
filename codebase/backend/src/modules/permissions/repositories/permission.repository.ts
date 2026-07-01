import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from '../schemas/permission.schema';

@Injectable()
export class PermissionRepository {
  constructor(
    @InjectModel(Permission.name)
    private readonly model: Model<PermissionDocument>,
  ) {}

  async create(data: Partial<Permission>): Promise<PermissionDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<PermissionDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<PermissionDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<PermissionDocument[]> {
    return this.model.find(filter).setOptions(options).exec();
  }

  async update(id: string, data: Partial<Permission>, options: Record<string, any> = {}): Promise<PermissionDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<PermissionDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
