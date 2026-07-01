import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';
import { Project } from '../../projects/schemas/project.schema';

export type BudgetDocument = Budget & Document;

export enum BudgetScope {
  ORGANIZATION = 'organization',
  PROJECT = 'project',
}

export enum BudgetStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true, collection: 'budgets' })
export class Budget {
  @Prop({ type: String, enum: BudgetScope, required: true })
  scope: BudgetScope;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Project', index: true })
  project?: Types.ObjectId | Project;

  @Prop({ required: true, type: Number, default: 0 })
  amount: number;

  @Prop({ required: true, type: Number, default: 0 })
  spent: number;

  @Prop({ required: true, default: 'USD', uppercase: true, trim: true })
  currency: string;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: [Number], default: [80, 100] })
  thresholds: number[];

  @Prop({ type: [Number], default: [] })
  alertedThresholds: number[];

  @Prop({ type: String, enum: BudgetStatus, default: BudgetStatus.ACTIVE })
  status: BudgetStatus;
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);

// Indexing for overlap checks
BudgetSchema.index({ organization: 1, scope: 1, startDate: 1, endDate: 1 });
