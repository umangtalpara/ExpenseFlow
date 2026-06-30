"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationSchemaName = exports.OrganizationSchema = exports.Organization = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Organization = class Organization {
    name;
    slug;
    logo;
    currency;
    timezone;
    status;
    subscription;
    financialYear;
    taxSettings;
};
exports.Organization = Organization;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Organization.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, lowercase: true, index: true }),
    __metadata("design:type", String)
], Organization.prototype, "slug", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Organization.prototype, "logo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'USD' }),
    __metadata("design:type", String)
], Organization.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'UTC' }),
    __metadata("design:type", String)
], Organization.prototype, "timezone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['active', 'suspended', 'trial'], default: 'trial' }),
    __metadata("design:type", String)
], Organization.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            plan: { type: String, default: 'free' },
            trialEndsAt: { type: Date },
            status: { type: String, default: 'active' },
        },
        _id: false,
    }),
    __metadata("design:type", Object)
], Organization.prototype, "subscription", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            startMonth: { type: Number, default: 4 },
            endMonth: { type: Number, default: 3 },
        },
        _id: false,
    }),
    __metadata("design:type", Object)
], Organization.prototype, "financialYear", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            taxId: { type: String },
            taxName: { type: String },
            taxRate: { type: Number, default: 0 },
        },
        _id: false,
    }),
    __metadata("design:type", Object)
], Organization.prototype, "taxSettings", void 0);
exports.Organization = Organization = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: true,
        collection: 'organizations',
        bypassTenantPlugin: true,
    })
], Organization);
exports.OrganizationSchema = mongoose_1.SchemaFactory.createForClass(Organization);
exports.OrganizationSchemaName = Organization.name;
//# sourceMappingURL=organization.schema.js.map