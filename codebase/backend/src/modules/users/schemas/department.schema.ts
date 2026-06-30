import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DepartmentDocument = Department & Document;

@Schema({
  timestamps: true,
  collection: 'departments',
  isTenantScoped: true,
} as any)
export class Department {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  code: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
export const DepartmentSchemaName = Department.name;
