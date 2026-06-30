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
exports.TenantInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const tenant_service_1 = require("./tenant.service");
let TenantInterceptor = class TenantInterceptor {
    tenantService;
    constructor(tenantService) {
        this.tenantService = tenantService;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const tenantId = request.user?.organizationId ||
            request.user?.organization ||
            request.headers['x-tenant-id'] ||
            null;
        if (tenantId) {
            return new rxjs_1.Observable((subscriber) => {
                this.tenantService.runWithTenant(tenantId, () => {
                    next.handle().subscribe(subscriber);
                });
            });
        }
        return next.handle();
    }
};
exports.TenantInterceptor = TenantInterceptor;
exports.TenantInterceptor = TenantInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_service_1.TenantService])
], TenantInterceptor);
//# sourceMappingURL=tenant.interceptor.js.map