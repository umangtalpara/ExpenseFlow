import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Vendor, VendorSchema } from './schemas/vendor.schema';
import { VendorRepository } from './repositories/vendor.repository';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { ProjectsModule } from '../projects/projects.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vendor.name, schema: VendorSchema },
    ]),
    ProjectsModule,
    RolesModule,
  ],
  providers: [VendorRepository, VendorsService],
  controllers: [VendorsController],
  exports: [VendorRepository, VendorsService],
})
export class VendorsModule {}
