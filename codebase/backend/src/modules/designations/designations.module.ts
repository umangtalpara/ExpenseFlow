import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Designation, DesignationSchema } from './schemas/designation.schema';
import { DesignationRepository } from './repositories/designation.repository';
import { DesignationsService } from './designations.service';
import { DesignationsController } from './designations.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Designation.name, schema: DesignationSchema },
    ]),
    UsersModule,
    RolesModule,
  ],
  providers: [DesignationRepository, DesignationsService],
  controllers: [DesignationsController],
  exports: [DesignationRepository, DesignationsService],
})
export class DesignationsModule {}
