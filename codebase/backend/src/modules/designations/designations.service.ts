import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DesignationRepository } from './repositories/designation.repository';
import { UserRepository } from '../users/repositories/user.repository';
import { CreateDesignationDto, UpdateDesignationDto } from './dto/designation.dto';
import { getTenantId } from '../../common/tenant/tenant.context';

@Injectable()
export class DesignationsService {
  constructor(
    private readonly designationRepository: DesignationRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async create(dto: CreateDesignationDto) {
    const tenantId = getTenantId();

    const existingName = await this.designationRepository.findOne({
      name: dto.name,
    });
    if (existingName) {
      throw new ConflictException('Designation with this name already exists');
    }

    const existingCode = await this.designationRepository.findOne({
      code: dto.code.toUpperCase(),
    });
    if (existingCode) {
      throw new ConflictException('Designation with this code already exists');
    }

    return this.designationRepository.create({
      name: dto.name,
      code: dto.code.toUpperCase(),
      organization: tenantId as any,
    });
  }

  async findAll() {
    return this.designationRepository.find({});
  }

  async findOne(id: string) {
    const desig = await this.designationRepository.findById(id);
    if (!desig) {
      throw new NotFoundException('Designation not found');
    }
    return desig;
  }

  async update(id: string, dto: UpdateDesignationDto) {
    const desig = await this.findOne(id);

    if (dto.name && dto.name !== desig.name) {
      const existingName = await this.designationRepository.findOne({ name: dto.name });
      if (existingName) {
        throw new ConflictException('Designation with this name already exists');
      }
    }

    if (dto.code && dto.code.toUpperCase() !== desig.code) {
      const existingCode = await this.designationRepository.findOne({ code: dto.code.toUpperCase() });
      if (existingCode) {
        throw new ConflictException('Designation with this code already exists');
      }
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.code) updateData.code = dto.code.toUpperCase();

    return this.designationRepository.update(id, updateData);
  }

  async delete(id: string) {
    const desig = await this.findOne(id);

    // Verify if any employee belongs to this designation
    const assignedUser = await this.userRepository.findOne({
      $or: [
        { designation: desig.name },
        { designation: desig.code },
      ],
    });

    if (assignedUser) {
      throw new BadRequestException('Cannot delete designation because employees are currently assigned to it');
    }

    return this.designationRepository.delete(id);
  }
}
