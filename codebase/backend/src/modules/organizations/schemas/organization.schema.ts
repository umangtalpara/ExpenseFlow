import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrganizationDocument = Organization & Document;

export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ type: String, enum: OrganizationStatus, default: OrganizationStatus.ACTIVE })
  status: OrganizationStatus;

  @Prop({ default: 'USD', trim: true })
  currency: string;

  @Prop({ default: 'UTC', trim: true })
  timezone: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  logo?: string;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
