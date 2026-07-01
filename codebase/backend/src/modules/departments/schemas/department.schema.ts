import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';

export type DepartmentDocument = Department & Document;

@Schema({ timestamps: true, collection: 'departments' })
export class Department {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);

// Unique name and code per organization context
DepartmentSchema.index({ name: 1, organization: 1 }, { unique: true });
DepartmentSchema.index({ code: 1, organization: 1 }, { unique: true });
