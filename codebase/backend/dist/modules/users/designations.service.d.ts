import { Model } from 'mongoose';
import { DesignationDocument } from './schemas/designation.schema';
import { CreateDesignationDto, UpdateDesignationDto } from './dto/designation.dto';
export declare class DesignationsService {
    private readonly desigModel;
    constructor(desigModel: Model<DesignationDocument>);
    create(dto: CreateDesignationDto): Promise<DesignationDocument>;
    findAll(): Promise<DesignationDocument[]>;
    findOne(id: string): Promise<DesignationDocument>;
    update(id: string, dto: UpdateDesignationDto): Promise<DesignationDocument>;
    remove(id: string): Promise<void>;
}
