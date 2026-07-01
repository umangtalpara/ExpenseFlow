import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from '../schemas/role.schema';

@Injectable()
export class RoleRepository {
  constructor(
    @InjectModel(Role.name)
    private readonly model: Model<RoleDocument>,
  ) {}

  async create(data: Partial<Role>): Promise<RoleDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<RoleDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<RoleDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<RoleDocument[]> {
    return this.model.find(filter).setOptions(options).exec();
  }

  async update(id: string, data: Partial<Role>, options: Record<string, any> = {}): Promise<RoleDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<RoleDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
