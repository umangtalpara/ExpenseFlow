import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus, ForbiddenException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { StorageService } from './services/storage.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly storageService: StorageService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const url = await this.storageService.uploadFile(file);
    return {
      filename: file.originalname,
      url,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req, @Body() createExpenseDto: CreateExpenseDto) {
    return this.expensesService.create(req.user.id, createExpenseDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(
    @Request() req,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string
  ) {
    const userRole = req.user.role || '';
    const isAdmin =
      userRole === 'Administrator' ||
      userRole === 'Organization Admin' ||
      userRole.includes('Admin') ||
      userRole === 'Auditor';

    const employeeId = isAdmin ? undefined : req.user.id;
    return this.expensesService.findAll({ employeeId, projectId, status });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Request() req, @Param('id') id: string) {
    const expense = await this.expensesService.findOne(id);
    const userRole = req.user.role || '';
    const isAdmin =
      userRole === 'Administrator' ||
      userRole === 'Organization Admin' ||
      userRole.includes('Admin') ||
      userRole === 'Auditor';

    if (expense.employee._id.toString() !== req.user.id && !isAdmin) {
      throw new ForbiddenException('You do not have permission to view this claim');
    }
    return expense;
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto
  ) {
    return this.expensesService.update(id, req.user.id, req.user.role, updateExpenseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Request() req, @Param('id') id: string) {
    return this.expensesService.delete(id, req.user.id);
  }
}
