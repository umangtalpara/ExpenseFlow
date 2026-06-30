import { Schema, Types } from 'mongoose';
import { TenantService } from './tenant.service';

export interface TenantPluginOptions {
  tenantService: TenantService;
}

export function tenantPlugin(schema: Schema, options: TenantPluginOptions) {
  const { tenantService } = options;

  // Add organization field to schema dynamically
  if (!schema.path('organization')) {
    schema.add({
      organization: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
      },
    });
  }

  const queryMethods = [
    'find',
    'findOne',
    'countDocuments',
    'estimatedDocumentCount',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
    'findOneAndUpdate',
  ];

  queryMethods.forEach((method) => {
    schema.pre(method as any, function (this: any) {
      const tenantId = tenantService.getTenantId();
      const queryOptions = this.getOptions();

      // Enforce tenant scoping if tenant ID exists in context and is not bypassed
      if (tenantId && !queryOptions?.bypassTenantFilter) {
        this.where({ organization: new Types.ObjectId(tenantId) });
      }
    });
  });

  schema.pre('save', function (this: any) {
    const tenantId = tenantService.getTenantId();
    // Inject tenant ID if not present on document and active in context
    if (tenantId && !this.get('organization')) {
      this.set('organization', new Types.ObjectId(tenantId));
    }
  });
}
