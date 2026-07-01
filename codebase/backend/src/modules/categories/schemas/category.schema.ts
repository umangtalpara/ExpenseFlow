import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';

export type CategoryDocument = Category & Document;

export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: String, enum: CategoryStatus, default: CategoryStatus.ACTIVE })
  status: CategoryStatus;

  @Prop({ type: Boolean, default: false })
  requireReceipt: boolean;

  @Prop({ type: Number })
  maxLimit?: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Scoped unique name and code per organization context
CategorySchema.index({ name: 1, organization: 1 }, { unique: true });
CategorySchema.index({ code: 1, organization: 1 }, { unique: true });
