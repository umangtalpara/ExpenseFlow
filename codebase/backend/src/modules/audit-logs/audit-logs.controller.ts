import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequiredPermissions } from '../../common/decorators/permissions.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @UseGuards(RbacGuard)
  @RequiredPermissions('audit-logs:view')
  @HttpCode(HttpStatus.OK)
  findAll(
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditLogsService.findAll({
      action,
      entityType,
      userId,
      startDate,
      endDate,
      page,
      limit,
    });
  }
}
