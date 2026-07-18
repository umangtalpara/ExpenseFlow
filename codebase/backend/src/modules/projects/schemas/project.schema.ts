import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';
import { User } from '../../users/schemas/user.schema';

export type ProjectDocument = Project & Document;

export enum ProjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMPLETED = 'completed',
  ON_HOLD = 'on-hold',
}

@Schema({ timestamps: true, collection: 'projects' })
export class Project {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  client: string;

  @Prop({ required: true, type: Number, default: 0 })
  budget: number;

  @Prop({ required: true, default: 'USD', uppercase: true, trim: true })
  currency: string;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ type: String, enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  status: ProjectStatus;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'User' }], default: [] })
  projectManagers: Types.ObjectId[] | User[];

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'User' }], default: [] })
  employees: Types.ObjectId[] | User[];

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'ApprovalWorkflow', required: false })
  approvalFlow?: Types.ObjectId | any;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Scoped unique name and code per organization context
ProjectSchema.index({ name: 1, organization: 1 }, { unique: true });
ProjectSchema.index({ code: 1, organization: 1 }, { unique: true });
