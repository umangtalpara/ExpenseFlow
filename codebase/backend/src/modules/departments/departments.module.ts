import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Department, DepartmentSchema } from './schemas/department.schema';
import { DepartmentRepository } from './repositories/department.repository';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Department.name, schema: DepartmentSchema },
    ]),
    UsersModule,
    RolesModule,
  ],
  providers: [DepartmentRepository, DepartmentsService],
  controllers: [DepartmentsController],
  exports: [DepartmentRepository, DepartmentsService],
})
export class DepartmentsModule {}
