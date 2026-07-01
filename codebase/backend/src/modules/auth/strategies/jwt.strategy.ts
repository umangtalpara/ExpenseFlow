import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../users/repositories/user.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback_secret_32_characters_long_minimum',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const userId = payload.sub;
    
    // We bypass tenant isolation to fetch the user profile for authentication,
    // as the tenant context is derived from the user's document itself.
    const user = await this.userRepository.findOne({ _id: userId }, { bypassTenantIsolation: true });
    
    if (!user || user.status === 'disabled') {
      throw new UnauthorizedException('Invalid token or account disabled');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      organization: user.organization.toString(),
      role: user.role.toString(),
    };
  }
}
