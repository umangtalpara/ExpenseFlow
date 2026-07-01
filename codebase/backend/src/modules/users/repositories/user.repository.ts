import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly model: Model<UserDocument>,
  ) {}

  async create(data: Partial<User>): Promise<UserDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}, projection: any = null): Promise<UserDocument | null> {
    const query = this.model.findById(id).setOptions(options);
    if (projection) {
      query.select(projection);
    }
    return query.exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}, projection: any = null): Promise<UserDocument | null> {
    const query = this.model.findOne(filter).setOptions(options);
    if (projection) {
      query.select(projection);
    }
    return query.exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}, projection: any = null): Promise<UserDocument[]> {
    const query = this.model.find(filter).setOptions(options);
    if (projection) {
      query.select(projection);
    }
    return query.exec();
  }

  async update(id: string, data: Partial<User>, options: Record<string, any> = {}): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<UserDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
