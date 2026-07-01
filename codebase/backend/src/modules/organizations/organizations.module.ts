import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    RolesModule,
  ],
  providers: [OrganizationRepository, OrganizationsService],
  controllers: [OrganizationsController],
  exports: [OrganizationRepository, OrganizationsService],
})
export class OrganizationsModule {}
