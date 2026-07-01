import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from './schemas/project.schema';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
    ]),
    UsersModule,
    RolesModule,
  ],
  providers: [ProjectRepository, ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectRepository, ProjectsService],
})
export class ProjectsModule {}
