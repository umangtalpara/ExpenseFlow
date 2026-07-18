import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, Req, ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, AssignMembersDto, AssignManagersDto } from './dto/project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequiredPermissions } from '../../common/decorators/permissions.decorator';
import { RoleRepository } from '../roles/repositories/role.repository';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly roleRepository: RoleRepository,
  ) {}

  @Post()
  @UseGuards(RbacGuard)
  @RequiredPermissions('projects:manage')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Req() req: any) {
    const roleDoc = await this.roleRepository.findById(req.user.role);
    const roleName = roleDoc?.name || '';
    const isAdmin = roleName === 'Organization Admin' || roleName === 'Administrator' || roleName.includes('Admin');

    if (isAdmin) {
      return this.projectsService.findAll();
    } else {
      return this.projectsService.findMine(req.user.id);
    }
  }

  @Get('my')
  @HttpCode(HttpStatus.OK)
  findMine(@Req() req: any) {
    return this.projectsService.findMine(req.user.id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Req() req: any, @Param('id') id: string) {
    const project = await this.projectsService.findOne(id);

    const roleDoc = await this.roleRepository.findById(req.user.role);
    const roleName = roleDoc?.name || '';
    const isAdmin = roleName === 'Organization Admin' || roleName === 'Administrator' || roleName.includes('Admin');

    if (!isAdmin) {
      if (roleName === 'Project Manager') {
        const isAssigned = project.projectManagers.some(
          (pmId: any) => pmId.toString() === req.user.id
        );
        if (!isAssigned) {
          throw new ForbiddenException('Access denied: You are not assigned to this project');
        }
      } else {
        const isAssigned = project.employees.some(
          (empId: any) => empId.toString() === req.user.id
        );
        if (!isAssigned) {
          throw new ForbiddenException('Access denied: You are not assigned to this project');
        }
      }
    }

    return project;
  }

  @Put(':id')
  @UseGuards(RbacGuard)
  @RequiredPermissions('projects:manage')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @RequiredPermissions('projects:manage')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }

  @Post(':id/members')
  @UseGuards(RbacGuard)
  @RequiredPermissions('projects:manage')
  @HttpCode(HttpStatus.OK)
  assignMembers(@Param('id') id: string, @Body() dto: AssignMembersDto) {
    return this.projectsService.assignMembers(id, dto.userIds);
  }

  @Post(':id/managers')
  @UseGuards(RbacGuard)
  @RequiredPermissions('projects:manage')
  @HttpCode(HttpStatus.OK)
  assignManagers(@Param('id') id: string, @Body() dto: AssignManagersDto) {
    return this.projectsService.assignManagers(id, dto.userIds);
  }
}
