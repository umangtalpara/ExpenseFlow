import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRepository } from '../../users/repositories/user.repository';
import { UserSession, UserSessionDocument } from '../schemas/session.schema';
import { runWithTenant } from '../../../common/tenant/tenant.context';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    @InjectModel(UserSession.name)
    private readonly sessionModel: Model<UserSessionDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback_secret_32_characters_long_minimum',
    });
  }

  async validate(payload: { sub: string; email: string; sid?: string }) {
    const userId = payload.sub;

    // Check if session is revoked
    if (payload.sid) {
      const session = await this.sessionModel.findById(payload.sid).setOptions({ bypassTenantIsolation: true }).exec();
      if (!session || session.status === 'revoked') {
        throw new UnauthorizedException('Session has been revoked or expired');
      }
      
      // Update last activity asynchronously under session's organization tenant context
      session.lastActivity = new Date();
      runWithTenant(session.organization.toString(), () => {
        session.save().catch((err) => console.error('Failed to update session activity', err));
      });
    }

    const user = await this.userRepository.findOne({ _id: userId }, { bypassTenantIsolation: true });

    if (!user || user.status === 'disabled') {
      throw new UnauthorizedException('Invalid token or account disabled');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      organization: user.organization.toString(),
      role: user.role.toString(),
      sid: payload.sid,
    };
  }
}
