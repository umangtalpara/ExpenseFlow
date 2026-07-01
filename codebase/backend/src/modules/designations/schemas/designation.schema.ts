import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';

export type DesignationDocument = Designation & Document;

@Schema({ timestamps: true, collection: 'designations' })
export class Designation {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;
}

export const DesignationSchema = SchemaFactory.createForClass(Designation);

// Unique name and code per organization context
DesignationSchema.index({ name: 1, organization: 1 }, { unique: true });
DesignationSchema.index({ code: 1, organization: 1 }, { unique: true });
