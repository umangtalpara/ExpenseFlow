import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reimbursement, ReimbursementSchema } from './schemas/reimbursement.schema';
import { ReimbursementRepository } from './repositories/reimbursement.repository';
import { ReimbursementsService } from './reimbursements.service';
import { ReimbursementsController } from './reimbursements.controller';
import { ExpensesModule } from '../expenses/expenses.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reimbursement.name, schema: ReimbursementSchema }]),
    ExpensesModule,
    PaymentMethodsModule,
    OrganizationsModule,
    AuditLogsModule,
    RolesModule,
  ],
  controllers: [ReimbursementsController],
  providers: [ReimbursementsService, ReimbursementRepository],
  exports: [ReimbursementsService, ReimbursementRepository],
})
export class ReimbursementsModule {}
