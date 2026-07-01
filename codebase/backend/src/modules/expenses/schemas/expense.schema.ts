import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Category } from '../../categories/schemas/category.schema';
import { PaymentMethod } from '../../payment-methods/schemas/payment-method.schema';
import { Project } from '../../projects/schemas/project.schema';
import { User } from '../../users/schemas/user.schema';
import { Organization } from '../../organizations/schemas/organization.schema';

export type ExpenseDocument = Expense & Document;

export enum ExpenseStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REIMBURSED = 'reimbursed',
}

@Schema({ timestamps: true, collection: 'expenses' })
export class Expense {
  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ required: true, uppercase: true, trim: true })
  currency: string;

  @Prop({ required: true, type: Number, default: 1 })
  exchangeRate: number;

  @Prop({ required: true, type: Number })
  convertedAmount: number;

  @Prop({ required: true, type: Date })
  date: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Category', required: true, index: true })
  category: Types.ObjectId | Category;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'PaymentMethod', required: true, index: true })
  paymentMethod: Types.ObjectId | PaymentMethod;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Project', index: true })
  project?: Types.ObjectId | Project;

  @Prop({ required: true, trim: true })
  merchant: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Number })
  gst?: number;

  @Prop({ trim: true })
  vendor?: string;

  @Prop({ trim: true })
  receiptUrl?: string;

  @Prop({ type: String, enum: ExpenseStatus, default: ExpenseStatus.DRAFT })
  status: ExpenseStatus;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, index: true })
  employee: Types.ObjectId | User;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
