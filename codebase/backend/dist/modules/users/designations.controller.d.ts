import { DesignationsService } from './designations.service';
import { CreateDesignationDto, UpdateDesignationDto } from './dto/designation.dto';
export declare class DesignationsController {
    private readonly desigService;
    constructor(desigService: DesignationsService);
    create(dto: CreateDesignationDto): Promise<import("./schemas/designation.schema").DesignationDocument>;
    findAll(): Promise<import("./schemas/designation.schema").DesignationDocument[]>;
    findOne(id: string): Promise<import("./schemas/designation.schema").DesignationDocument>;
    update(id: string, dto: UpdateDesignationDto): Promise<import("./schemas/designation.schema").DesignationDocument>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
