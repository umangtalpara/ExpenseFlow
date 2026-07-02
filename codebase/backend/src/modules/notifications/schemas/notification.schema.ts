import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Organization } from '../../organizations/schemas/organization.schema';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, index: true })
  recipient: Types.ObjectId | User;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  body: string;

  @Prop({ required: true, trim: true })
  type: string;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: SchemaTypes.Map, of: SchemaTypes.Mixed, default: {} })
  data: Record<string, any>;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
