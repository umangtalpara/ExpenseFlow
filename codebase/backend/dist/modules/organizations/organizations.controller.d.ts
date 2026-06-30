import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
export declare class OrganizationsController {
    private readonly orgsService;
    constructor(orgsService: OrganizationsService);
    getProfile(req: any): Promise<import("./schemas/organization.schema").OrganizationDocument>;
    updateProfile(dto: UpdateOrganizationDto, req: any): Promise<import("./schemas/organization.schema").OrganizationDocument>;
}
