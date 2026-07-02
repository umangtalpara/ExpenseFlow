import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { Vendor, VendorDocument } from '../vendors/schemas/vendor.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Vendor.name) private readonly vendorModel: Model<VendorDocument>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  async globalSearch(query: string) {
    if (!query || query.trim() === '') {
      return {
        users: [],
        projects: [],
        vendors: [],
        expenses: [],
      };
    }

    const cleanQuery = query.trim();
    // Escape regex special characters to prevent errors
    const escapedQuery = cleanQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    try {
      const [users, projects, vendors, expenses] = await Promise.all([
        this.userModel
          .find({
            $or: [
              { name: regex },
              { email: regex },
              { employeeId: regex },
              { department: regex },
              { designation: regex },
            ],
          })
          .limit(10)
          .exec(),
        this.projectModel
          .find({
            $or: [
              { name: regex },
              { code: regex },
              { client: regex },
            ],
          })
          .limit(10)
          .exec(),
        this.vendorModel
          .find({
            $or: [
              { name: regex },
              { company: regex },
              { contactPerson: regex },
              { contactEmail: regex },
            ],
          })
          .limit(10)
          .exec(),
        this.expenseModel
          .find({
            $or: [
              { merchant: regex },
              { description: regex },
              { vendor: regex },
            ],
          })
          .populate('employee', 'name email')
          .populate('project', 'name code')
          .limit(15)
          .exec(),
      ]);

      return {
        users,
        projects,
        vendors,
        expenses,
      };
    } catch (err) {
      console.error('Global search query failure:', err);
      throw new BadRequestException('Search execution failed');
    }
  }
}
