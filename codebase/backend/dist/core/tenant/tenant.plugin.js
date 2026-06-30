"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantPlugin = tenantPlugin;
const mongoose_1 = require("mongoose");
function tenantPlugin(schema, options) {
    const { tenantService } = options;
    if (!schema.path('organization')) {
        schema.add({
            organization: {
                type: mongoose_1.Schema.Types.ObjectId,
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
        schema.pre(method, function () {
            const tenantId = tenantService.getTenantId();
            const queryOptions = this.getOptions();
            if (tenantId && !queryOptions?.bypassTenantFilter) {
                this.where({ organization: new mongoose_1.Types.ObjectId(tenantId) });
            }
        });
    });
    schema.pre('save', function () {
        const tenantId = tenantService.getTenantId();
        if (tenantId && !this.get('organization')) {
            this.set('organization', new mongoose_1.Types.ObjectId(tenantId));
        }
    });
}
//# sourceMappingURL=tenant.plugin.js.map