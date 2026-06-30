import { Body, Controller, Post, HttpCode, HttpStatus, UnauthorizedException, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { InviteUserDto } from './dto/invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    return this.authService.refresh(refreshToken);
  }

  @Roles(UserRole.ORG_ADMIN, UserRole.MANAGER)
  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  async invite(@Body() dto: InviteUserDto, @Req() req: any) {
    return this.authService.invite(dto, req.user);
  }

  @Public()
  @Post('invite/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }
}
