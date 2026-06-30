import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Designation, DesignationDocument } from './schemas/designation.schema';
import { CreateDesignationDto, UpdateDesignationDto } from './dto/designation.dto';

@Injectable()
export class DesignationsService {
  constructor(
    @InjectModel(Designation.name)
    private readonly desigModel: Model<DesignationDocument>,
  ) {}

  async create(dto: CreateDesignationDto): Promise<DesignationDocument> {
    const existing = await this.desigModel.findOne({ code: dto.code.toUpperCase() });
    if (existing) {
      throw new ConflictException(`Designation with code ${dto.code} already exists`);
    }

    const desig = new this.desigModel({
      name: dto.name,
      code: dto.code.toUpperCase(),
    });
    return desig.save();
  }

  async findAll(): Promise<DesignationDocument[]> {
    return this.desigModel.find();
  }

  async findOne(id: string): Promise<DesignationDocument> {
    const desig = await this.desigModel.findById(id);
    if (!desig) {
      throw new NotFoundException('Designation not found');
    }
    return desig;
  }

  async update(id: string, dto: UpdateDesignationDto): Promise<DesignationDocument> {
    if (dto.code) {
      dto.code = dto.code.toUpperCase();
      const existing = await this.desigModel.findOne({ code: dto.code, _id: { $ne: id } });
      if (existing) {
        throw new ConflictException(`Designation with code ${dto.code} already exists`);
      }
    }

    const desig = await this.desigModel.findByIdAndUpdate(id, { $set: dto }, { new: true });
    if (!desig) {
      throw new NotFoundException('Designation not found');
    }
    return desig;
  }

  async remove(id: string): Promise<void> {
    const result = await this.desigModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Designation not found');
    }
  }
}
