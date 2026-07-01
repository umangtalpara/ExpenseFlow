import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';

export type PaymentMethodDocument = PaymentMethod & Document;

export enum PaymentMethodType {
  CASH = 'cash',
  CORPORATE_CARD = 'corporate_card',
  PERSONAL_CARD = 'personal_card',
  OTHER = 'other',
}

export enum PaymentMethodStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true, collection: 'payment_methods' })
export class PaymentMethod {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ type: String, enum: PaymentMethodType, required: true })
  type: PaymentMethodType;

  @Prop({ type: String, enum: PaymentMethodStatus, default: PaymentMethodStatus.ACTIVE })
  status: PaymentMethodStatus;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;
}

export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod);

// Scoped unique name and code per organization context
PaymentMethodSchema.index({ name: 1, organization: 1 }, { unique: true });
PaymentMethodSchema.index({ code: 1, organization: 1 }, { unique: true });
