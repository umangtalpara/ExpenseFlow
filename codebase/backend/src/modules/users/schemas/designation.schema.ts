import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DesignationDocument = Designation & Document;

@Schema({
  timestamps: true,
  collection: 'designations',
  isTenantScoped: true,
} as any)
export class Designation {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  code: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const DesignationSchema = SchemaFactory.createForClass(Designation);
export const DesignationSchemaName = Designation.name;
