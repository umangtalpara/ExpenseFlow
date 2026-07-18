import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus, ForbiddenException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { StorageService } from './services/storage.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleRepository } from '../roles/repositories/role.repository';
import { ProjectRepository } from '../projects/repositories/project.repository';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly storageService: StorageService,
    private readonly roleRepository: RoleRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const { extname } = await import('path');
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const ext = extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file format. Only JPG, jpeg, PNG, and PDF files are allowed.');
    }

    const url = await this.storageService.uploadFile(file);
    return {
      filename: file.originalname,
      url,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: any, @Body() createExpenseDto: CreateExpenseDto) {
    return this.expensesService.create(req.user.id, createExpenseDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Request() req: any,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string
  ) {
    const roleDoc = await this.roleRepository.findById(req.user.role);
    const roleName = roleDoc?.name || '';

    const isAdmin =
      roleName === 'Organization Admin' ||
      roleName === 'Administrator' ||
      roleName.includes('Admin') ||
      roleName === 'Auditor';

    const isPM = roleName === 'Project Manager';

    if (projectId && !isAdmin) {
      if (isPM) {
        // Verify PM is assigned to this project
        const projDoc = await this.projectRepository.findById(projectId);
        const isAssigned = projDoc?.projectManagers?.some(
          (pmId: any) => pmId.toString() === req.user.id
        );
        if (!isAssigned) {
          throw new ForbiddenException('Access denied: You are not assigned to this project');
        }
      } else {
        // Employee
        const projDoc = await this.projectRepository.findById(projectId);
        const isAssigned = projDoc?.employees?.some(
          (empId: any) => empId.toString() === req.user.id
        );
        if (!isAssigned) {
          throw new ForbiddenException('Access denied: You are not assigned to this project');
        }
      }
    }

    let employeeId = undefined;
    let allowedProjectIds: string[] | undefined = undefined;

    if (!isAdmin) {
      if (isPM) {
        const managedProjects = await this.projectRepository.find({
          projectManagers: req.user.id,
        });
        allowedProjectIds = managedProjects.map((p) => p._id.toString());
        // A PM should see their own submitted claims OR claims for projects they manage
        employeeId = req.user.id;
      } else {
        employeeId = req.user.id;
      }
    }

    return this.expensesService.findAll({ employeeId, projectId, status, allowedProjectIds } as any);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Request() req: any, @Param('id') id: string) {
    const expense = await this.expensesService.findOne(id);
    const roleDoc = await this.roleRepository.findById(req.user.role);
    const roleName = roleDoc?.name || '';
    const isAdmin =
      roleName === 'Organization Admin' ||
      roleName === 'Administrator' ||
      roleName.includes('Admin') ||
      roleName === 'Auditor';

    const isPM = roleName === 'Project Manager';

    if ((expense.employee as any)._id.toString() !== req.user.id && !isAdmin) {
      if (isPM && expense.project) {
        // Verify PM is assigned to the expense project
        const projDoc = await this.projectRepository.findById((expense.project as any)._id.toString());
        const isAssigned = projDoc?.projectManagers?.some(
          (pmId: any) => pmId.toString() === req.user.id
        );
        if (!isAssigned) {
          throw new ForbiddenException('You do not have permission to view this claim');
        }
      } else {
        throw new ForbiddenException('You do not have permission to view this claim');
      }
    }
    return expense;
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto
  ) {
    return this.expensesService.update(id, req.user.id, req.user.role, updateExpenseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Request() req: any, @Param('id') id: string) {
    return this.expensesService.delete(id, req.user.id);
  }
}
