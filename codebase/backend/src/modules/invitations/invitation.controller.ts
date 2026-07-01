import { Controller, Post, Get, Body, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto, AcceptInvitationDto } from './dto/invitation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequiredPermissions } from '../../common/decorators/permissions.decorator';

@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequiredPermissions('users:manage')
  @HttpCode(HttpStatus.CREATED)
  createInvitation(@Body() createInvitationDto: CreateInvitationDto, @Req() req: any) {
    const adminOrgId = req.user.organization;
    return this.invitationService.createInvitation(createInvitationDto, adminOrgId);
  }

  @Get('verify/:token')
  @HttpCode(HttpStatus.OK)
  verifyToken(@Param('token') token: string) {
    return this.invitationService.verifyToken(token);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(@Body() acceptInvitationDto: AcceptInvitationDto) {
    return this.invitationService.acceptInvitation(acceptInvitationDto);
  }
}
