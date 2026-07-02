import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ReimbursementsService } from './reimbursements.service';
import { CreateReimbursementDto, PayReimbursementDto } from './dto/reimbursement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequiredPermissions } from '../../common/decorators/permissions.decorator';
import { ReimbursementStatus } from './schemas/reimbursement.schema';

@Controller('reimbursements')
@UseGuards(JwtAuthGuard)
export class ReimbursementsController {
  constructor(private readonly reimbursementsService: ReimbursementsService) {}

  @Post('batches/generate')
  @UseGuards(RbacGuard)
  @RequiredPermissions('reimbursements:manage')
  @HttpCode(HttpStatus.CREATED)
  generateBatch(@Request() req: any, @Body() dto: CreateReimbursementDto) {
    return this.reimbursementsService.generateBatch(req.user.id, dto);
  }

  @Get('batches')
  @HttpCode(HttpStatus.OK)
  findAll(@Query('status') status?: ReimbursementStatus) {
    return this.reimbursementsService.findAll(status);
  }

  @Get('batches/:id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string) {
    return this.reimbursementsService.findOne(id);
  }

  @Put('batches/:id/pay')
  @UseGuards(RbacGuard)
  @RequiredPermissions('reimbursements:manage')
  @HttpCode(HttpStatus.OK)
  payBatch(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: PayReimbursementDto,
  ) {
    return this.reimbursementsService.payBatch(id, req.user.id, dto);
  }

  @Get('ledger')
  @HttpCode(HttpStatus.OK)
  getLedger(
    @Query('paymentMethodId') paymentMethodId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reimbursementsService.getLedger({
      paymentMethodId,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  @Delete('batches/:id')
  @UseGuards(RbacGuard)
  @RequiredPermissions('reimbursements:manage')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string) {
    return this.reimbursementsService.delete(id);
  }
}
