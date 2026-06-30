import { Model } from 'mongoose';
import { DepartmentDocument } from './schemas/department.schema';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
export declare class DepartmentsService {
    private readonly deptModel;
    constructor(deptModel: Model<DepartmentDocument>);
    create(dto: CreateDepartmentDto): Promise<DepartmentDocument>;
    findAll(): Promise<DepartmentDocument[]>;
    findOne(id: string): Promise<DepartmentDocument>;
    update(id: string, dto: UpdateDepartmentDto): Promise<DepartmentDocument>;
    remove(id: string): Promise<void>;
}
