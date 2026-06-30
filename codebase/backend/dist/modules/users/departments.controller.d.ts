import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
export declare class DepartmentsController {
    private readonly deptsService;
    constructor(deptsService: DepartmentsService);
    create(dto: CreateDepartmentDto): Promise<import("./schemas/department.schema").DepartmentDocument>;
    findAll(): Promise<import("./schemas/department.schema").DepartmentDocument[]>;
    findOne(id: string): Promise<import("./schemas/department.schema").DepartmentDocument>;
    update(id: string, dto: UpdateDepartmentDto): Promise<import("./schemas/department.schema").DepartmentDocument>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
