import { Controller, Get, Patch, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequiredPermissions } from '../../common/decorators/permissions.decorator';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  getProfile() {
    return this.organizationsService.getProfile();
  }

  @Patch('profile')
  @UseGuards(RbacGuard)
  @RequiredPermissions('users:manage')
  @HttpCode(HttpStatus.OK)
  updateProfile(@Body() updateOrganizationDto: UpdateOrganizationDto) {
    return this.organizationsService.updateProfile(updateOrganizationDto);
  }
}
