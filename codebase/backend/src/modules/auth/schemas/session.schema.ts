import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Organization } from '../../organizations/schemas/organization.schema';

export type UserSessionDocument = UserSession & Document;

@Schema({ timestamps: true, collection: 'user_sessions' })
export class UserSession {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId | User;

  @Prop({ trim: true })
  ipAddress?: string;

  @Prop({ trim: true })
  userAgent?: string;

  @Prop({ type: String, enum: ['active', 'revoked'], default: 'active' })
  status: 'active' | 'revoked';

  @Prop({ type: Date, default: Date.now })
  lastActivity: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);
