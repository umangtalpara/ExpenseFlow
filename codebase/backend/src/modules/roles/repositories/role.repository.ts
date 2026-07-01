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

  async findById(id: string): Promise<RoleDocument | null> {
    return this.model.findById(id).exec();
  }

  async findOne(filter: Record<string, any>): Promise<RoleDocument | null> {
    return this.model.findOne(filter).exec();
  }

  async find(filter: Record<string, any> = {}): Promise<RoleDocument[]> {
    return this.model.find(filter).exec();
  }

  async update(id: string, data: Partial<Role>): Promise<RoleDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<RoleDocument | null> {
    return this.model.findByIdAndDelete(id).exec();
  }
}
