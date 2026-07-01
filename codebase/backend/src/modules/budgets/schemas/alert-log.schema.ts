import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Budget } from './budget.schema';
import { Project } from '../../projects/schemas/project.schema';
import { Organization } from '../../organizations/schemas/organization.schema';

export type AlertLogDocument = AlertLog & Document;

@Schema({ timestamps: true, collection: 'alert_logs' })
export class AlertLog {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Budget', required: true })
  budget: Types.ObjectId | Budget;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Project' })
  project?: Types.ObjectId | Project;

  @Prop({ required: true, type: Number })
  threshold: number;

  @Prop({ required: true, type: Number })
  percentage: number;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ required: true, type: Number })
  spent: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;
}

export const AlertLogSchema = SchemaFactory.createForClass(AlertLog);
