import { Controller, Get, Query, UseGuards, Req, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService, ReportFilters } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequiredPermissions } from '../../common/decorators/permissions.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('data')
  @RequiredPermissions('expenses:view')
  async getReportData(@Query() filters: ReportFilters, @Req() req: any) {
    const tenantId = req.user.organization;
    return this.reportsService.getReportData(filters, tenantId);
  }

  @Get('export')
  @RequiredPermissions('expenses:view')
  async exportReport(@Query() filters: ReportFilters, @Req() req: any, @Res() res: any) {
    const tenantId = req.user.organization;
    const csvContent = await this.reportsService.exportToCsv(filters, tenantId);
    
    const filename = `expense-report-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csvContent);
  }
}
