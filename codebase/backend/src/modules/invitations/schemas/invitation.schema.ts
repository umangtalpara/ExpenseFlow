import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';
import { Role } from '../../roles/schemas/role.schema';

export type InvitationDocument = Invitation & Document;

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true, collection: 'invitations' })
export class Invitation {
  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Role', required: true })
  role: Types.ObjectId | Role;

  @Prop({ required: true, unique: true, index: true, trim: true })
  token: string;

  @Prop({ type: String, enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);

// Add unique compound index on email + organization + status (only allow one pending invite for an email in an organization)
InvitationSchema.index(
  { email: 1, organization: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);
