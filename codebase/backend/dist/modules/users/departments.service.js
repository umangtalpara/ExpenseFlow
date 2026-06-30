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
exports.DepartmentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const department_schema_1 = require("./schemas/department.schema");
let DepartmentsService = class DepartmentsService {
    deptModel;
    constructor(deptModel) {
        this.deptModel = deptModel;
    }
    async create(dto) {
        const existing = await this.deptModel.findOne({ code: dto.code.toUpperCase() });
        if (existing) {
            throw new common_1.ConflictException(`Department with code ${dto.code} already exists`);
        }
        const dept = new this.deptModel({
            name: dto.name,
            code: dto.code.toUpperCase(),
        });
        return dept.save();
    }
    async findAll() {
        return this.deptModel.find();
    }
    async findOne(id) {
        const dept = await this.deptModel.findById(id);
        if (!dept) {
            throw new common_1.NotFoundException('Department not found');
        }
        return dept;
    }
    async update(id, dto) {
        if (dto.code) {
            dto.code = dto.code.toUpperCase();
            const existing = await this.deptModel.findOne({ code: dto.code, _id: { $ne: id } });
            if (existing) {
                throw new common_1.ConflictException(`Department with code ${dto.code} already exists`);
            }
        }
        const dept = await this.deptModel.findByIdAndUpdate(id, { $set: dto }, { new: true });
        if (!dept) {
            throw new common_1.NotFoundException('Department not found');
        }
        return dept;
    }
    async remove(id) {
        const result = await this.deptModel.findByIdAndDelete(id);
        if (!result) {
            throw new common_1.NotFoundException('Department not found');
        }
    }
};
exports.DepartmentsService = DepartmentsService;
exports.DepartmentsService = DepartmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(department_schema_1.Department.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map