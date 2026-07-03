import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProjectRepository } from './repositories/project.repository';
import { UserRepository } from '../users/repositories/user.repository';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { getTenantId } from '../../common/tenant/tenant.context';
import { Types } from 'mongoose';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async create(dto: CreateProjectDto) {
    const tenantId = getTenantId();

    const existingName = await this.projectRepository.findOne({
      name: dto.name,
    });
    if (existingName) {
      throw new ConflictException('Project with this name already exists');
    }

    const existingCode = await this.projectRepository.findOne({
      code: dto.code.toUpperCase(),
    });
    if (existingCode) {
      throw new ConflictException('Project with this code already exists');
    }

    return this.projectRepository.create({
      ...dto,
      code: dto.code.toUpperCase(),
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      organization: tenantId as any,
    });
  }

  private async getSpentAmount(projectId: string): Promise<number> {
    try {
      const mongoose = await import('mongoose');
      const ExpenseModel = mongoose.model('Expense');
      const result = await ExpenseModel.aggregate([
        {
          $match: {
            project: new mongoose.Types.ObjectId(projectId),
            status: { $in: ['submitted', 'approved', 'reimbursed'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$convertedAmount' },
          },
        },
      ]);
      return result[0]?.total || 0;
    } catch (err) {
      return 0;
    }
  }

  async findAll() {
    const projects = await this.projectRepository.find({});
    const enriched = [];
    for (const project of projects) {
      const spent = await this.getSpentAmount(project._id.toString());
      enriched.push({
        ...project.toObject(),
        spent,
      });
    }
    return enriched;
  }

  async findMine(userId: string) {
    const { Types } = await import('mongoose');
    const oid = new Types.ObjectId(userId);
    const projects = await this.projectRepository.find({
      $or: [{ employees: oid }, { projectManagers: oid }],
    });
    const enriched = [];
    for (const project of projects) {
      const spent = await this.getSpentAmount(project._id.toString());
      enriched.push({
        ...project.toObject(),
        spent,
      });
    }
    return enriched;
  }

  async findOne(id: string) {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const populated = await project.populate(['projectManagers', 'employees']);
    return populated;
  }

  async update(id: string, dto: UpdateProjectDto) {
    const project = await this.findOne(id);

    if (dto.name && dto.name !== project.name) {
      const existingName = await this.projectRepository.findOne({ name: dto.name });
      if (existingName) {
        throw new ConflictException('Project with this name already exists');
      }
    }

    if (dto.code && dto.code.toUpperCase() !== project.code) {
      const existingCode = await this.projectRepository.findOne({ code: dto.code.toUpperCase() });
      if (existingCode) {
        throw new ConflictException('Project with this code already exists');
      }
    }

    const updateData: any = { ...dto };
    if (dto.code) updateData.code = dto.code.toUpperCase();
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

    return this.projectRepository.update(id, updateData);
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.projectRepository.delete(id);
  }

  async assignMembers(id: string, userIds: string[]) {
    await this.findOne(id);

    const objectIds: Types.ObjectId[] = [];
    for (const userId of userIds) {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      objectIds.push(new Types.ObjectId(userId));
    }

    return this.projectRepository.update(id, { employees: objectIds });
  }

  async assignManagers(id: string, userIds: string[]) {
    await this.findOne(id);

    const objectIds: Types.ObjectId[] = [];
    for (const userId of userIds) {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      objectIds.push(new Types.ObjectId(userId));
    }

    return this.projectRepository.update(id, { projectManagers: objectIds });
  }
}
