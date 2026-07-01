import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Expense } from '../../expenses/schemas/expense.schema';
import { ApprovalWorkflow } from './approval-workflow.schema';
import { User } from '../../users/schemas/user.schema';
import { Organization } from '../../organizations/schemas/organization.schema';

export type ApprovalRequestDocument = ApprovalRequest & Document;

export enum ApprovalRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ApprovalAction {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ _id: false })
export class ApprovalHistoryItem {
  @Prop({ required: true, type: Number })
  stepNumber: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  approver: Types.ObjectId | User;

  @Prop({ type: String, enum: ApprovalAction, required: true })
  action: ApprovalAction;

  @Prop({ type: Date, default: Date.now })
  actionDate: Date;

  @Prop({ trim: true })
  comment?: string;
}

@Schema({ timestamps: true, collection: 'approval_requests' })
export class ApprovalRequest {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Expense', required: true, unique: true, index: true })
  expense: Types.ObjectId | Expense;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'ApprovalWorkflow', required: true })
  workflow: Types.ObjectId | ApprovalWorkflow;

  @Prop({ type: Number, default: 1 })
  currentStepNumber: number;

  @Prop({ type: String, enum: ApprovalRequestStatus, default: ApprovalRequestStatus.PENDING })
  status: ApprovalRequestStatus;

  @Prop({ type: [ApprovalHistoryItem], default: [] })
  history: ApprovalHistoryItem[];

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;
}

export const ApprovalRequestSchema = SchemaFactory.createForClass(ApprovalRequest);
