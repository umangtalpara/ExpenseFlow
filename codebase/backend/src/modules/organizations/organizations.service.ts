import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Organization, OrganizationDocument } from './schemas/organization.schema';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
  ) {}

  async findOne(id: string): Promise<OrganizationDocument> {
    const org = await this.orgModel.findById(id);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<OrganizationDocument> {
    const org = await this.orgModel.findByIdAndUpdate(id, { $set: dto }, { new: true });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }
}
