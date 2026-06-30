import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Department, DepartmentSchema } from './schemas/department.schema';
import { Designation, DesignationSchema } from './schemas/designation.schema';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { DesignationsService } from './designations.service';
import { DesignationsController } from './designations.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Designation.name, schema: DesignationSchema },
    ]),
  ],
  providers: [DepartmentsService, DesignationsService],
  controllers: [DepartmentsController, DesignationsController],
  exports: [MongooseModule, DepartmentsService, DesignationsService],
})
export class UsersModule {}
