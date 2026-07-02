import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';
import { Expense } from '../../expenses/schemas/expense.schema';
import { PaymentMethod } from '../../payment-methods/schemas/payment-method.schema';
import { User } from '../../users/schemas/user.schema';

export type ReimbursementDocument = Reimbursement & Document;

export enum ReimbursementStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  PAID = 'paid',
}

@Schema({ timestamps: true, collection: 'reimbursements' })
export class Reimbursement {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;

  @Prop({ required: true, trim: true })
  batchName: string;

  @Prop({ type: String, enum: ReimbursementStatus, default: ReimbursementStatus.DRAFT, index: true })
  status: ReimbursementStatus;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'Expense' }], required: true, index: true })
  expenses: Types.ObjectId[] | Expense[];

  @Prop({ required: true, type: Number })
  totalAmount: number;

  @Prop({ required: true, uppercase: true, trim: true })
  currency: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'PaymentMethod', index: true })
  paymentMethod?: Types.ObjectId | PaymentMethod;

  @Prop({ type: Date })
  payoutDate?: Date;

  @Prop({ trim: true })
  referenceNumber?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId | User;
}

export const ReimbursementSchema = SchemaFactory.createForClass(Reimbursement);
