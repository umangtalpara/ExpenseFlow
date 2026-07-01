import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { VendorRepository } from './repositories/vendor.repository';
import { ProjectRepository } from '../projects/repositories/project.repository';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { getTenantId } from '../../common/tenant/tenant.context';
import { Types } from 'mongoose';

@Injectable()
export class VendorsService {
  constructor(
    private readonly vendorRepository: VendorRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  async create(dto: CreateVendorDto) {
    const tenantId = getTenantId();

    const existingName = await this.vendorRepository.findOne({
      name: dto.name,
    });
    if (existingName) {
      throw new ConflictException('Vendor with this name already exists');
    }

    const existingCompany = await this.vendorRepository.findOne({
      company: dto.company,
    });
    if (existingCompany) {
      throw new ConflictException('Vendor with this company name already exists');
    }

    return this.vendorRepository.create({
      ...dto,
      organization: tenantId as any,
    });
  }

  async findAll(query?: { projectId?: string }) {
    const filter: Record<string, any> = {};
    if (query?.projectId) {
      filter.projects = new Types.ObjectId(query.projectId);
    }
    return this.vendorRepository.find(filter);
  }

  async findOne(id: string) {
    const vendor = await this.vendorRepository.findById(id);
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    const populated = await vendor.populate('projects');
    return populated;
  }

  async update(id: string, dto: UpdateVendorDto) {
    const vendor = await this.findOne(id);

    if (dto.name && dto.name !== vendor.name) {
      const existingName = await this.vendorRepository.findOne({ name: dto.name });
      if (existingName) {
        throw new ConflictException('Vendor with this name already exists');
      }
    }

    if (dto.company && dto.company !== vendor.company) {
      const existingCompany = await this.vendorRepository.findOne({ company: dto.company });
      if (existingCompany) {
        throw new ConflictException('Vendor with this company name already exists');
      }
    }

    return this.vendorRepository.update(id, dto);
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.vendorRepository.delete(id);
  }

  async linkProjects(id: string, projectIds: string[]) {
    await this.findOne(id);

    const objectIds: Types.ObjectId[] = [];
    for (const projectId of projectIds) {
      const proj = await this.projectRepository.findById(projectId);
      if (!proj) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
      }
      objectIds.push(new Types.ObjectId(projectId));
    }

    return this.vendorRepository.update(id, { projects: objectIds });
  }
}
