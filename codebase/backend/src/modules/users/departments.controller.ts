import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './schemas/user.schema';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly deptsService: DepartmentsService) {}

  @Roles(UserRole.ORG_ADMIN, UserRole.MANAGER)
  @Post()
  async create(@Body() dto: CreateDepartmentDto) {
    return this.deptsService.create(dto);
  }

  @Get()
  async findAll() {
    return this.deptsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.deptsService.findOne(id);
  }

  @Roles(UserRole.ORG_ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.deptsService.update(id, dto);
  }

  @Roles(UserRole.ORG_ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.deptsService.remove(id);
    return { message: 'Department successfully deleted' };
  }
}
