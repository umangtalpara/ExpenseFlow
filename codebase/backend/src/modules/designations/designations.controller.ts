import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { DesignationsService } from './designations.service';
import { CreateDesignationDto, UpdateDesignationDto } from './dto/designation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequiredPermissions } from '../../common/decorators/permissions.decorator';

@Controller('designations')
@UseGuards(JwtAuthGuard)
export class DesignationsController {
  constructor(private readonly designationsService: DesignationsService) {}

  @Post()
  @UseGuards(RbacGuard)
  @RequiredPermissions('users:manage')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDesignationDto: CreateDesignationDto) {
    return this.designationsService.create(createDesignationDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll() {
    return this.designationsService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string) {
    return this.designationsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RbacGuard)
  @RequiredPermissions('users:manage')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() updateDesignationDto: UpdateDesignationDto) {
    return this.designationsService.update(id, updateDesignationDto);
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @RequiredPermissions('users:manage')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string) {
    return this.designationsService.delete(id);
  }
}
