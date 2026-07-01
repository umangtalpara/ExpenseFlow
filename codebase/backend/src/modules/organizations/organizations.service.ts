import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationRepository } from './repositories/organization.repository';
import { getTenantId } from '../../common/tenant/tenant.context';
import { UpdateOrganizationDto } from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  async getProfile() {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new NotFoundException('Tenant context not found');
    }
    const org = await this.organizationRepository.findById(tenantId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async updateProfile(dto: UpdateOrganizationDto) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new NotFoundException('Tenant context not found');
    }
    const updated = await this.organizationRepository.update(tenantId, dto);
    if (!updated) {
      throw new NotFoundException('Organization not found');
    }
    return updated;
  }
}
