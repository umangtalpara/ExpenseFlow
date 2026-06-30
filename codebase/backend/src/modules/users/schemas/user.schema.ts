import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ORG_ADMIN = 'org_admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
}

export enum UserStatus {
  PENDING_INVITE = 'pending_invite',
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

@Schema({
  timestamps: true,
  collection: 'users',
  isTenantScoped: true,
} as any)
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop()
  mobile?: string;

  @Prop()
  employeeId?: string;

  // Explicitly define organization to allow null for Super Admin
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: false, index: true })
  organization?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  department?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Designation' })
  designation?: Types.ObjectId;

  @Prop()
  joiningDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  manager?: Types.ObjectId;

  @Prop({ required: true, enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  @Prop({ required: true, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop()
  profileImage?: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  @Prop()
  twoFactorSecret?: string;

  @Prop({ default: false })
  twoFactorEnabled: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
export const UserSchemaName = User.name;
