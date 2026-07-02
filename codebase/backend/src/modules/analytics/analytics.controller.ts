import { Controller, Get, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  async getDashboardMetrics(@Req() req: any) {
    const userId = req.user.id;
    const tenantId = req.user.organization;
    return this.analyticsService.getDashboardMetrics(userId, tenantId);
  }
}
