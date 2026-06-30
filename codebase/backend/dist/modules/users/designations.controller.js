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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignationsController = void 0;
const common_1 = require("@nestjs/common");
const designations_service_1 = require("./designations.service");
const designation_dto_1 = require("./dto/designation.dto");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_schema_1 = require("./schemas/user.schema");
let DesignationsController = class DesignationsController {
    desigService;
    constructor(desigService) {
        this.desigService = desigService;
    }
    async create(dto) {
        return this.desigService.create(dto);
    }
    async findAll() {
        return this.desigService.findAll();
    }
    async findOne(id) {
        return this.desigService.findOne(id);
    }
    async update(id, dto) {
        return this.desigService.update(id, dto);
    }
    async remove(id) {
        await this.desigService.remove(id);
        return { message: 'Designation successfully deleted' };
    }
};
exports.DesignationsController = DesignationsController;
__decorate([
    (0, roles_decorator_1.Roles)(user_schema_1.UserRole.ORG_ADMIN, user_schema_1.UserRole.MANAGER),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [designation_dto_1.CreateDesignationDto]),
    __metadata("design:returntype", Promise)
], DesignationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DesignationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DesignationsController.prototype, "findOne", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_schema_1.UserRole.ORG_ADMIN),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, designation_dto_1.UpdateDesignationDto]),
    __metadata("design:returntype", Promise)
], DesignationsController.prototype, "update", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_schema_1.UserRole.ORG_ADMIN),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DesignationsController.prototype, "remove", null);
exports.DesignationsController = DesignationsController = __decorate([
    (0, common_1.Controller)('designations'),
    __metadata("design:paramtypes", [designations_service_1.DesignationsService])
], DesignationsController);
//# sourceMappingURL=designations.controller.js.map