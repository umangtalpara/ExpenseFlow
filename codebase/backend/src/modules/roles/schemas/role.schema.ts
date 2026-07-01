import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';
import { Permission } from '../../permissions/schemas/permission.schema';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true, collection: 'roles' })
export class Role {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true, index: true })
  organization: Types.ObjectId | Organization;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'Permission' }], default: [] })
  permissions: Types.ObjectId[] | Permission[];

  @Prop({ trim: true })
  description?: string;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

// Define a unique compound index for name + organization to ensure roles are unique within a tenant
RoleSchema.index({ name: 1, organization: 1 }, { unique: true });
