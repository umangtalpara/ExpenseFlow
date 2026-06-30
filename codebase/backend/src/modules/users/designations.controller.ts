import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DesignationsService } from './designations.service';
import { CreateDesignationDto, UpdateDesignationDto } from './dto/designation.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './schemas/user.schema';

@Controller('designations')
export class DesignationsController {
  constructor(private readonly desigService: DesignationsService) {}

  @Roles(UserRole.ORG_ADMIN, UserRole.MANAGER)
  @Post()
  async create(@Body() dto: CreateDesignationDto) {
    return this.desigService.create(dto);
  }

  @Get()
  async findAll() {
    return this.desigService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.desigService.findOne(id);
  }

  @Roles(UserRole.ORG_ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDesignationDto) {
    return this.desigService.update(id, dto);
  }

  @Roles(UserRole.ORG_ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.desigService.remove(id);
    return { message: 'Designation successfully deleted' };
  }
}
