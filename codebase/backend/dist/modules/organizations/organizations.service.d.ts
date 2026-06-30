import { Model } from 'mongoose';
import { OrganizationDocument } from './schemas/organization.schema';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
export declare class OrganizationsService {
    private readonly orgModel;
    constructor(orgModel: Model<OrganizationDocument>);
    findOne(id: string): Promise<OrganizationDocument>;
    update(id: string, dto: UpdateOrganizationDto): Promise<OrganizationDocument>;
}
