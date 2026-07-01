import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto, LinkProjectsDto } from './dto/vendor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequiredPermissions } from '../../common/decorators/permissions.decorator';

@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @UseGuards(RbacGuard)
  @RequiredPermissions('projects:manage')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorsService.create(createVendorDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@Query('projectId') projectId?: string) {
    return this.vendorsService.findAll({ projectId });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string) {
    return this.vendorsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RbacGuard)
  @RequiredPermissions('projects:manage')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() updateVendorDto: UpdateVendorDto) {
    return this.vendorsService.update(id, updateVendorDto);
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @RequiredPermissions('projects:manage')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string) {
    return this.vendorsService.delete(id);
  }

  @Post(':id/link-projects')
  @UseGuards(RbacGuard)
  @RequiredPermissions('projects:manage')
  @HttpCode(HttpStatus.OK)
  linkProjects(@Param('id') id: string, @Body() dto: LinkProjectsDto) {
    return this.vendorsService.linkProjects(id, dto.projectIds);
  }
}
