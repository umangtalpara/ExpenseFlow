import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalWorkflowDto, UpdateApprovalWorkflowDto } from './dto/approval-workflow.dto';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequiredPermissions } from '../../common/decorators/permissions.decorator';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  // --- Workflows Administration (Admin Only) ---

  @Post('workflows')
  @UseGuards(RbacGuard)
  @RequiredPermissions('projects:manage')
  @HttpCode(HttpStatus.CREATED)
  createWorkflow(@Body() dto: CreateApprovalWorkflowDto) {
    return this.approvalsService.createWorkflow(dto);
  }

  @Get('workflows')
  @HttpCode(HttpStatus.OK)
  findAllWorkflows() {
    return this.approvalsService.findAllWorkflows();
  }

  @Get('workflows/:id')
  @HttpCode(HttpStatus.OK)
  findOneWorkflow(@Param('id') id: string) {
    return this.approvalsService.findOneWorkflow(id);
  }

  @Put('workflows/:id')
  @UseGuards(RbacGuard)
  @RequiredPermissions('projects:manage')
  @HttpCode(HttpStatus.OK)
  updateWorkflow(@Param('id') id: string, @Body() dto: UpdateApprovalWorkflowDto) {
    return this.approvalsService.updateWorkflow(id, dto);
  }

  @Delete('workflows/:id')
  @UseGuards(RbacGuard)
  @RequiredPermissions('projects:manage')
  @HttpCode(HttpStatus.OK)
  deleteWorkflow(@Param('id') id: string) {
    return this.approvalsService.deleteWorkflow(id);
  }

  // --- Inbox & Action Processing ---

  @Get('inbox')
  @HttpCode(HttpStatus.OK)
  getInbox(@Request() req: any) {
    return this.approvalsService.getInbox(req.user.id, req.user.role);
  }

  @Post(':id/action')
  @HttpCode(HttpStatus.OK)
  takeAction(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: ApprovalActionDto
  ) {
    return this.approvalsService.takeAction(id, req.user.id, req.user.role, dto);
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  getAuditHistory() {
    return this.approvalsService.getAuditHistory();
  }
}
