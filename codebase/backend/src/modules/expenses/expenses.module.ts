import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Expense, ExpenseSchema } from './schemas/expense.schema';
import { ExpenseRepository } from './repositories/expense.repository';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { CurrencyExchangeAdapter } from './adapters/currency-exchange.adapter';
import { CategoriesModule } from '../categories/categories.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { ProjectsModule } from '../projects/projects.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { BudgetsModule } from '../budgets/budgets.module';

import { StorageService } from './services/storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
    ]),
    CategoriesModule,
    PaymentMethodsModule,
    ProjectsModule,
    OrganizationsModule,
    BudgetsModule,
  ],
  providers: [ExpenseRepository, CurrencyExchangeAdapter, ExpensesService, StorageService],
  controllers: [ExpensesController],
  exports: [ExpenseRepository, ExpensesService, StorageService],
})
export class ExpensesModule {}
