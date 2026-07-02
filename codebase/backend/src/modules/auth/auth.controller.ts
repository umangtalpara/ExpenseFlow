import { Controller, Post, Get, Put, Delete, Body, Param, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto, @Request() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const ua = req.headers['user-agent'] || 'Unknown Device';
    return this.authService.login(loginDto, ip, ua);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@Request() req: any) {
    return this.authService.logout(req.user, req.user.sid);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  // --- Two-Factor Authentication (2FA) ---

  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  generate2faSecret(@Request() req: any) {
    return this.authService.generate2faSecret(req.user.id);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  enable2fa(@Request() req: any, @Body('secret') secret: string, @Body('code') code: string) {
    return this.authService.enable2fa(req.user.id, secret, code);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  disable2fa(@Request() req: any, @Body('code') code: string) {
    return this.authService.disable2fa(req.user.id, code);
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  verify2faLogin(
    @Body('tempToken') tempToken: string,
    @Body('code') code: string,
    @Request() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const ua = req.headers['user-agent'] || 'Unknown Device';
    return this.authService.verify2faLogin(tempToken, code, ip, ua);
  }

  // --- Session Management ---

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getActiveSessions(@Request() req: any) {
    return this.authService.getActiveSessions(req.user.id);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  revokeSession(@Param('id') id: string, @Request() req: any) {
    return this.authService.revokeSession(id, req.user.id);
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  revokeAllOtherSessions(@Request() req: any) {
    return this.authService.revokeAllOtherSessions(req.user.id, req.user.sid);
  }
}
