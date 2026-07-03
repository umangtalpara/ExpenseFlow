import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { RoleRepository } from './repositories/role.repository';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { getTenantId } from '../../common/tenant/tenant.context';

@Injectable()
export class RolesService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async create(dto: CreateRoleDto) {
    const tenantId = getTenantId();

    const existing = await this.roleRepository.findOne({ name: dto.name, organization: tenantId });
    if (existing) {
      throw new ConflictException('A role with this name already exists in your organization');
    }

    return this.roleRepository.create({
      ...dto,
      organization: tenantId as any,
      permissions: (dto.permissions ?? []) as any,
    });
  }

  async findAll() {
    const tenantId = getTenantId();
    return this.roleRepository.find({ organization: tenantId }, { lean: true });
  }

  async findOne(id: string) {
    const tenantId = getTenantId();
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    const tenantId = getTenantId();
    await this.findOne(id);

    if (dto.name) {
      const conflict = await this.roleRepository.findOne({
        name: dto.name,
        organization: tenantId,
        _id: { $ne: id },
      });
      if (conflict) {
        throw new ConflictException('A role with this name already exists in your organization');
      }
    }

    const updateData: any = { ...dto };
    const updated = await this.roleRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundException('Role not found');
    }
    return updated;
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.roleRepository.delete(id);
  }
}
