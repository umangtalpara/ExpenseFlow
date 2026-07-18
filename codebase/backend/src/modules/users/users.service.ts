import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UpdateUserDto } from './dto/user.dto';
import { UserStatus } from './schemas/user.schema';
import { getTenantId } from '../../common/tenant/tenant.context';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    designation?: string;
    status?: string;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { employeeId: searchRegex },
      ];
    }

    if (query.department) {
      filter.department = query.department;
    }

    if (query.designation) {
      filter.designation = query.designation;
    }

    if (query.status) {
      filter.status = query.status;
    }

    // Standard pagination count
    // Since userRepository find returns documents, we can fetch all or do a query
    // Wait! Let's check: does userRepository support pagination directly?
    // In UserRepository, we have:
    // `async find(filter, options, projection)`
    // To support pagination, we can query users using find with limit and skip, but wait,
    // in our UserRepository we just returned `this.model.find(filter).setOptions(options).exec();`.
    // Let's modify UserRepository's `find` to support limit/skip or write a custom paginate method, OR we can just pass skip/limit in options since setOptions passes options to the mongoose Query object!
    // Yes! In Mongoose, you can pass options like `skip` and `limit` in `setOptions(options)` or pass them directly!
    // Let's check: `this.model.find(filter).setOptions({ skip, limit })` works perfectly in Mongoose!
    // But wait! We also need the total count!
    // We can call `this.userRepository.find(filter)` and then count, or define a count method.
    // Wait! Let's check: how can we count documents?
    // In our tenant-isolation plugin:
    // We register: `schema.pre('countDocuments', applyTenantFilter);`
    // But wait, does UserRepository have a count method? It doesn't have a count method, but we can query using find.
    // Wait, let's add a `count(filter, options)` method to UserRepository, or we can just fetch the total list and count them in memory?
    // Since we are running in-memory or small datasets in test, counting in memory is fine, but for production scalability we should use `countDocuments`!
    // Let's add `count` to `UserRepository` to run `this.model.countDocuments(filter).setOptions(options).exec()`.
    // Wait, we can modify `UserRepository` to add:
    // `async count(filter: Record<string, any>, options: Record<string, any> = {}): Promise<number>`
    // Let's do that! First let's check what methods are in `UserRepository` and modify it.
    
    // Let's implement UsersService's findAll using count:
    // (We will write count inside UserRepository in a minute)
    // Wait, we can also inject the roleRepository to verify roles if needed.
    return {
      users: await this.userRepository.find(filter, { skip, limit }),
      total: await this.userRepository.count(filter),
      page,
      limit,
      pages: Math.ceil((await this.userRepository.count(filter)) / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Populate role and manager references
    const populated = await user.populate(['role', 'manager']);
    return populated;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.manager) {
      if (dto.manager === id) {
        throw new BadRequestException('User cannot be their own manager');
      }
      const managerExists = await this.userRepository.findById(dto.manager);
      if (!managerExists) {
        throw new NotFoundException('Manager user not found');
      }
    }

    const updateData: any = { ...dto };
    if (dto.joiningDate) {
      updateData.joiningDate = new Date(dto.joiningDate);
    }
    if (dto.password) {
      const bcrypt = await import('bcrypt');
      updateData.password = await bcrypt.hash(dto.password, 12);
    }

    const updated = await this.userRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return updated;
  }

  async updateStatus(id: string, status: UserStatus) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.userRepository.update(id, { status });
  }

  async delete(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.userRepository.delete(id);
  }
}
