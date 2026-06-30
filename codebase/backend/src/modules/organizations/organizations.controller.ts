import { Body, Controller, Get, Patch, Req, BadRequestException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get('me')
  async getProfile(@Req() req: any) {
    if (!req.user.organizationId) {
      throw new BadRequestException('User does not belong to any organization');
    }
    return this.orgsService.findOne(req.user.organizationId);
  }

  @Roles(UserRole.ORG_ADMIN)
  @Patch('me')
  async updateProfile(@Body() dto: UpdateOrganizationDto, @Req() req: any) {
    if (!req.user.organizationId) {
      throw new BadRequestException('User does not belong to any organization');
    }
    return this.orgsService.update(req.user.organizationId, dto);
  }
}
