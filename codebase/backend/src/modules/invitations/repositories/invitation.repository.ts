import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invitation, InvitationDocument } from '../schemas/invitation.schema';

@Injectable()
export class InvitationRepository {
  constructor(
    @InjectModel(Invitation.name)
    private readonly model: Model<InvitationDocument>,
  ) {}

  async create(data: Partial<Invitation>): Promise<InvitationDocument> {
    return this.model.create(data);
  }

  async findById(id: string, options: Record<string, any> = {}): Promise<InvitationDocument | null> {
    return this.model.findById(id).setOptions(options).exec();
  }

  async findOne(filter: Record<string, any>, options: Record<string, any> = {}): Promise<InvitationDocument | null> {
    return this.model.findOne(filter).setOptions(options).exec();
  }

  async find(filter: Record<string, any> = {}, options: Record<string, any> = {}): Promise<InvitationDocument[]> {
    return this.model.find(filter).setOptions(options).exec();
  }

  async update(id: string, data: Partial<Invitation>, options: Record<string, any> = {}): Promise<InvitationDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).setOptions(options).exec();
  }

  async delete(id: string, options: Record<string, any> = {}): Promise<InvitationDocument | null> {
    return this.model.findByIdAndDelete(id).setOptions(options).exec();
  }
}
