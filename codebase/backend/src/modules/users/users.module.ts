import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Department, DepartmentSchema } from './schemas/department.schema';
import { Designation, DesignationSchema } from './schemas/designation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Designation.name, schema: DesignationSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class UsersModule {}
