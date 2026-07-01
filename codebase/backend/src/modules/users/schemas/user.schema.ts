import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';
import { Role } from '../../roles/schemas/role.schema';

export type UserDocument = User & Document;

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISABLED = 'disabled',
}

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Role', required: true })
  role: Types.ObjectId | Role;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ trim: true })
  mobile?: string;

  @Prop({ trim: true })
  employeeId?: string;

  @Prop({ trim: true })
  department?: string;

  @Prop({ trim: true })
  designation?: string;

  @Prop({ type: Date })
  joiningDate?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  manager?: Types.ObjectId | User;

  @Prop({ trim: true })
  profileImage?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
