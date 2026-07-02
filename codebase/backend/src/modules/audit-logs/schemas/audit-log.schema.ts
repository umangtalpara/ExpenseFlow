import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';
import { User } from '../../users/schemas/user.schema';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: { createdAt: 'timestamp', updatedAt: false }, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
  user?: Types.ObjectId | User;

  @Prop({ required: true, trim: true, index: true })
  action: string;

  @Prop({ trim: true, index: true })
  entityType?: string;

  @Prop({ trim: true, index: true })
  entityId?: string;

  @Prop({ type: SchemaTypes.Mixed })
  details?: any;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
