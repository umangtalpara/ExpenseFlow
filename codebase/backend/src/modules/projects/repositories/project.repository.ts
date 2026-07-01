import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from '../schemas/project.schema';

@Injectable()
export class ProjectRepository {
  constructor(
    @InjectModel(Project.name)
    private readonly model: Model<ProjectDocument>,
  ) {}

  async create(data: Partial<Project>): Promise<ProjectDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<ProjectDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<ProjectDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<ProjectDocument[]> {
    return this.model.find(filter).setOptions(options).exec();
  }

  async update(id: string, data: Partial<Project>, options: Record<string, any> = {}): Promise<ProjectDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<ProjectDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
