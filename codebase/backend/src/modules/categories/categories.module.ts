import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './schemas/category.schema';
import { CategoryRepository } from './repositories/category.repository';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
    RolesModule,
  ],
  providers: [CategoryRepository, CategoriesService],
  controllers: [CategoriesController],
  exports: [CategoryRepository, CategoriesService],
})
export class CategoriesModule {}
