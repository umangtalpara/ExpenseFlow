import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserStatus } from '../../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback_secret',
    });
  }

  async validate(payload: any) {
    // Validate JWT subject and status. Use bypassTenantFilter since user loading bootstraps tenant context
    const user = await this.userModel
      .findById(payload.sub)
      .setOptions({ bypassTenantFilter: true });

    if (!user || user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('User is inactive or does not exist');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organization?.toString() || null,
    };
  }
}
