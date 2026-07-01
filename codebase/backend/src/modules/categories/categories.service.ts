import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CategoryRepository } from './repositories/category.repository';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { getTenantId } from '../../common/tenant/tenant.context';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async create(dto: CreateCategoryDto) {
    const tenantId = getTenantId();

    const existingName = await this.categoryRepository.findOne({ name: dto.name });
    if (existingName) {
      throw new ConflictException('Category with this name already exists');
    }

    const existingCode = await this.categoryRepository.findOne({ code: dto.code.toUpperCase() });
    if (existingCode) {
      throw new ConflictException('Category with this code already exists');
    }

    return this.categoryRepository.create({
      ...dto,
      code: dto.code.toUpperCase(),
      organization: tenantId as any,
    });
  }

  async findAll() {
    return this.categoryRepository.find({});
  }

  async findOne(id: string) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    if (dto.name && dto.name !== category.name) {
      const existingName = await this.categoryRepository.findOne({ name: dto.name });
      if (existingName) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    if (dto.code && dto.code.toUpperCase() !== category.code) {
      const existingCode = await this.categoryRepository.findOne({ code: dto.code.toUpperCase() });
      if (existingCode) {
        throw new ConflictException('Category with this code already exists');
      }
    }

    const updateData: any = { ...dto };
    if (dto.code) updateData.code = dto.code.toUpperCase();

    return this.categoryRepository.update(id, updateData);
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.categoryRepository.delete(id);
  }
}
