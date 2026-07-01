import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';
import { Project } from '../../projects/schemas/project.schema';

export type VendorDocument = Vendor & Document;

export enum VendorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true, collection: 'vendors' })
export class Vendor {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  company: string;

  @Prop({ trim: true })
  gstPan?: string;

  @Prop({ lowercase: true, trim: true })
  contactEmail?: string;

  @Prop({ trim: true })
  contactPhone?: string;

  @Prop({ trim: true })
  bankName?: string;

  @Prop({ trim: true })
  bankAccount?: string;

  @Prop({ trim: true })
  bankIfsc?: string;

  @Prop({ type: String, enum: VendorStatus, default: VendorStatus.ACTIVE })
  status: VendorStatus;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'Project' }], default: [] })
  projects: Types.ObjectId[] | Project[];

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);

// Scoped unique name and company legal name per organization context
VendorSchema.index({ name: 1, organization: 1 }, { unique: true });
VendorSchema.index({ company: 1, organization: 1 }, { unique: true });
