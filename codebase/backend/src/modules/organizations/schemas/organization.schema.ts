import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrganizationDocument = Organization & Document;

@Schema({
  timestamps: true,
  collection: 'organizations',
  // Custom option to skip multi-tenant query interceptor
  bypassTenantPlugin: true,
} as any)
export class Organization {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  slug: string;

  @Prop()
  logo?: string;

  @Prop({ required: true, default: 'USD' })
  currency: string;

  @Prop({ required: true, default: 'UTC' })
  timezone: string;

  @Prop({ required: true, enum: ['active', 'suspended', 'trial'], default: 'trial' })
  status: string;

  @Prop({
    type: {
      plan: { type: String, default: 'free' },
      trialEndsAt: { type: Date },
      status: { type: String, default: 'active' },
    },
    _id: false,
  })
  subscription: {
    plan: string;
    trialEndsAt?: Date;
    status: string;
  };

  @Prop({
    type: {
      startMonth: { type: Number, default: 4 },
      endMonth: { type: Number, default: 3 },
    },
    _id: false,
  })
  financialYear: {
    startMonth: number;
    endMonth: number;
  };

  @Prop({
    type: {
      taxId: { type: String },
      taxName: { type: String },
      taxRate: { type: Number, default: 0 },
    },
    _id: false,
  })
  taxSettings: {
    taxId?: string;
    taxName?: string;
    taxRate: number;
  };
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
export const OrganizationSchemaName = Organization.name;
