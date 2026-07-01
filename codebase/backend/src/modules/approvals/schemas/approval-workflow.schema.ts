import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Category } from '../../categories/schemas/category.schema';
import { Role } from '../../roles/schemas/role.schema';
import { User } from '../../users/schemas/user.schema';
import { Organization } from '../../organizations/schemas/organization.schema';

export type ApprovalWorkflowDocument = ApprovalWorkflow & Document;

export enum WorkflowStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ _id: false })
export class WorkflowConditions {
  @Prop({ type: Number })
  minAmount?: number;

  @Prop({ type: Number })
  maxAmount?: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Category' })
  category?: Types.ObjectId | Category;
}

@Schema({ _id: false })
export class ApprovalStep {
  @Prop({ required: true, type: Number })
  stepNumber: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Role' })
  approverRole?: Types.ObjectId | Role;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  approverUser?: Types.ObjectId | User;
}

@Schema({ timestamps: true, collection: 'approval_workflows' })
export class ApprovalWorkflow {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: String, enum: WorkflowStatus, default: WorkflowStatus.ACTIVE })
  status: WorkflowStatus;

  @Prop({ type: Boolean, default: false })
  isDefault: boolean;

  @Prop({ type: WorkflowConditions, default: {} })
  conditions: WorkflowConditions;

  @Prop({ type: [ApprovalStep], required: true })
  steps: ApprovalStep[];

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;
}

export const ApprovalWorkflowSchema = SchemaFactory.createForClass(ApprovalWorkflow);
