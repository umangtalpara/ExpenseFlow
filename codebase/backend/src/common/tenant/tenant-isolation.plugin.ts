import { Schema, Query, CallbackWithoutResultAndRequiredError } from 'mongoose';
import { getTenantId } from './tenant.context';
import { BadRequestException } from '@nestjs/common';

export function tenantIsolationPlugin(schema: Schema): void {
  // If the schema does not have an 'organization' field, we don't apply isolation
  if (!schema.paths['organization']) {
    return;
  }

  // Pre-query hook to automatically apply organization filter
  const applyTenantFilter = function (this: Query<unknown, unknown>) {
    const options = this.getOptions();
    if (options['bypassTenantIsolation'] === true) {
      return;
    }

    const tenantId = getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required for this operation');
    }

    // Force query filter to include organization ID
    this.where({ organization: tenantId });
  };

  // Register hooks for all standard query methods
  const queryMethods = [
    'find',
    'findOne',
    'countDocuments',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndReplace',
  ];

  queryMethods.forEach((method) => {
    schema.pre(method as any, applyTenantFilter);
  });

  // Pre-validate hook to set and validate organization ID for new/updated documents before schema validation
  schema.pre('validate', function (this: any) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required to save this resource');
    }

    const currentOrg = this.get('organization');
    if (!currentOrg) {
      this.set('organization', tenantId);
    } else if (currentOrg.toString() !== tenantId) {
      throw new BadRequestException('Organization mismatch in tenant context');
    }
  });

  // Pre-insertMany hook for bulk operations
  schema.pre('insertMany', function (this: any, docs: any[]) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required to insert resources');
    }

    for (const doc of docs) {
      const currentOrg = doc.organization;
      if (!currentOrg) {
        doc.organization = tenantId;
      } else if (currentOrg.toString() !== tenantId) {
        throw new BadRequestException('Organization mismatch in tenant context');
      }
    }
  });
}
