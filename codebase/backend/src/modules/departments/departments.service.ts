import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DepartmentRepository } from './repositories/department.repository';
import { UserRepository } from '../users/repositories/user.repository';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { getTenantId } from '../../common/tenant/tenant.context';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async create(dto: CreateDepartmentDto) {
    const tenantId = getTenantId();

    const existingName = await this.departmentRepository.findOne({
      name: dto.name,
    });
    if (existingName) {
      throw new ConflictException('Department with this name already exists');
    }

    const existingCode = await this.departmentRepository.findOne({
      code: dto.code.toUpperCase(),
    });
    if (existingCode) {
      throw new ConflictException('Department with this code already exists');
    }

    return this.departmentRepository.create({
      name: dto.name,
      code: dto.code.toUpperCase(),
      organization: tenantId as any,
    });
  }

  async findAll() {
    return this.departmentRepository.find({});
  }

  async findOne(id: string) {
    const dept = await this.departmentRepository.findById(id);
    if (!dept) {
      throw new NotFoundException('Department not found');
    }
    return dept;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const dept = await this.findOne(id);

    if (dto.name && dto.name !== dept.name) {
      const existingName = await this.departmentRepository.findOne({ name: dto.name });
      if (existingName) {
        throw new ConflictException('Department with this name already exists');
      }
    }

    if (dto.code && dto.code.toUpperCase() !== dept.code) {
      const existingCode = await this.departmentRepository.findOne({ code: dto.code.toUpperCase() });
      if (existingCode) {
        throw new ConflictException('Department with this code already exists');
      }
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.code) updateData.code = dto.code.toUpperCase();

    return this.departmentRepository.update(id, updateData);
  }

  async delete(id: string) {
    const dept = await this.findOne(id);

    // Verify if any employee belongs to this department (checking both name and code match)
    const assignedUser = await this.userRepository.findOne({
      $or: [
        { department: dept.name },
        { department: dept.code },
      ],
    });

    if (assignedUser) {
      throw new BadRequestException('Cannot delete department because employees are currently assigned to it');
    }

    return this.departmentRepository.delete(id);
  }
}
