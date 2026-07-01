import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Budget, BudgetSchema } from './schemas/budget.schema';
import { AlertLog, AlertLogSchema } from './schemas/alert-log.schema';
import { BudgetRepository } from './repositories/budget.repository';
import { AlertLogRepository } from './repositories/alert-log.repository';
import { BudgetsService } from './budgets.service';
import { BudgetsController } from './budgets.controller';
import { BudgetAlertsProcessor } from './processors/budget-alerts.processor';
import { ProjectsModule } from '../projects/projects.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Budget.name, schema: BudgetSchema },
      { name: AlertLog.name, schema: AlertLogSchema },
    ]),
    BullModule.registerQueue({
      name: 'budget-alerts',
    }),
    ProjectsModule,
    RolesModule,
  ],
  providers: [
    BudgetRepository,
    AlertLogRepository,
    BudgetsService,
    BudgetAlertsProcessor,
  ],
  controllers: [BudgetsController],
  exports: [BudgetRepository, AlertLogRepository, BudgetsService],
})
export class BudgetsModule {}
