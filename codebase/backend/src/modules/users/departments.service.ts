import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department, DepartmentDocument } from './schemas/department.schema';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name)
    private readonly deptModel: Model<DepartmentDocument>,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<DepartmentDocument> {
    const existing = await this.deptModel.findOne({ code: dto.code.toUpperCase() });
    if (existing) {
      throw new ConflictException(`Department with code ${dto.code} already exists`);
    }

    const dept = new this.deptModel({
      name: dto.name,
      code: dto.code.toUpperCase(),
    });
    return dept.save();
  }

  async findAll(): Promise<DepartmentDocument[]> {
    return this.deptModel.find();
  }

  async findOne(id: string): Promise<DepartmentDocument> {
    const dept = await this.deptModel.findById(id);
    if (!dept) {
      throw new NotFoundException('Department not found');
    }
    return dept;
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<DepartmentDocument> {
    if (dto.code) {
      dto.code = dto.code.toUpperCase();
      const existing = await this.deptModel.findOne({ code: dto.code, _id: { $ne: id } });
      if (existing) {
        throw new ConflictException(`Department with code ${dto.code} already exists`);
      }
    }

    const dept = await this.deptModel.findByIdAndUpdate(id, { $set: dto }, { new: true });
    if (!dept) {
      throw new NotFoundException('Department not found');
    }
    return dept;
  }

  async remove(id: string): Promise<void> {
    const result = await this.deptModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Department not found');
    }
  }
}
