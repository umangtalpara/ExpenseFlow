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

  async findById(id: string): Promise<UserDocument | null> {
    return this.model.findById(id).exec();
  }

  async findOne(filter: Record<string, any>): Promise<UserDocument | null> {
    return this.model.findOne(filter).exec();
  }

  async find(filter: Record<string, any> = {}): Promise<UserDocument[]> {
    return this.model.find(filter).exec();
  }

  async update(id: string, data: Partial<User>): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<UserDocument | null> {
    return this.model.findByIdAndDelete(id).exec();
  }
}
