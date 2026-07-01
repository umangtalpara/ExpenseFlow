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

  async findById(id: string): Promise<OrganizationDocument | null> {
    return this.model.findById(id).exec();
  }

  async findOne(filter: Record<string, any>): Promise<OrganizationDocument | null> {
    return this.model.findOne(filter).exec();
  }

  async find(filter: Record<string, any> = {}): Promise<OrganizationDocument[]> {
    return this.model.find(filter).exec();
  }

  async update(id: string, data: Partial<Organization>): Promise<OrganizationDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<OrganizationDocument | null> {
    return this.model.findByIdAndDelete(id).exec();
  }
}
