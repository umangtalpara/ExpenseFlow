import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Organization, OrganizationDocument } from '../schemas/organization.schema';

@Injectable()
export class OrganizationRepository {
  constructor(
    @InjectModel(Organization.name)
    private readonly model: Model<OrganizationDocument>,
  ) {}

  async create(data: Partial<Organization>): Promise<OrganizationDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<OrganizationDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<OrganizationDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<OrganizationDocument[]> {
    return this.model.find(filter).setOptions(options).exec();
  }

  async update(id: string, data: Partial<Organization>, options: Record<string, any> = {}): Promise<OrganizationDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<OrganizationDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
