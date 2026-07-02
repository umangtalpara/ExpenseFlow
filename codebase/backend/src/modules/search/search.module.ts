import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Vendor, VendorSchema } from '../vendors/schemas/vendor.schema';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: Expense.name, schema: ExpenseSchema },
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
