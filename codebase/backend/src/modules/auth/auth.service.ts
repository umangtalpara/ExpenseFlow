import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  Organization,
  OrganizationDocument,
} from '../organizations/schemas/organization.schema';
import { User, UserDocument, UserRole, UserStatus } from '../users/schemas/user.schema';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { InviteUserDto } from './dto/invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    // 1. Check if organization slug is already in use
    const existingOrg = await this.orgModel.findOne({ slug: dto.orgSlug.toLowerCase() });
    if (existingOrg) {
      throw new ConflictException('Organization slug is already in use');
    }

    // 2. Check if user email is already in use
    const existingUser = await this.userModel
      .findOne({ email: dto.adminEmail.toLowerCase() })
      .setOptions({ bypassTenantFilter: true });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // 3. Create the organization
    const org = new this.orgModel({
      name: dto.orgName,
      slug: dto.orgSlug.toLowerCase(),
      status: 'trial',
      subscription: {
        plan: 'free',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day trial
        status: 'active',
      },
    });
    await org.save();

    // 4. Create the admin user
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = new this.userModel({
      name: dto.adminName,
      email: dto.adminEmail.toLowerCase(),
      passwordHash,
      organization: org._id,
      role: UserRole.ORG_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await user.save();

    return {
      message: 'Organization and administrator successfully registered',
      organizationId: org._id.toString(),
      userId: user._id.toString(),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .setOptions({ bypassTenantFilter: true });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('User account is disabled');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organization?.toString() || null,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organization?.toString() || null,
      },
    };
  }

  async refresh(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userModel
        .findById(payload.sub)
        .setOptions({ bypassTenantFilter: true });

      if (!user || user.status === UserStatus.DISABLED) {
        throw new UnauthorizedException('Invalid user context');
      }

      const newPayload = {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
        organizationId: user.organization?.toString() || null,
      };

      const accessToken = this.jwtService.sign(newPayload);
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async invite(dto: InviteUserDto, currentUser: any) {
    const existingUser = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .setOptions({ bypassTenantFilter: true });

    if (existingUser) {
      throw new ConflictException('User with this email is already registered');
    }

    const inviteToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    const invited = new this.userModel({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash: 'pending_invite_activation',
      role: dto.role,
      status: UserStatus.PENDING_INVITE,
      organization: currentUser.organizationId,
      emailVerificationToken: inviteToken,
      isEmailVerified: false,
    });
    await invited.save();

    const inviteLink = `http://localhost:3000/invite/accept?token=${inviteToken}`;

    return {
      message: 'Invitation successfully created',
      inviteToken,
      inviteLink,
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const user = await this.userModel
      .findOne({ emailVerificationToken: dto.token })
      .setOptions({ bypassTenantFilter: true });

    if (!user || user.status !== UserStatus.PENDING_INVITE) {
      throw new UnauthorizedException('Invalid or expired invitation token');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    user.passwordHash = passwordHash;
    user.status = UserStatus.ACTIVE;
    user.emailVerificationToken = undefined;
    user.isEmailVerified = true;
    await user.save();

    return {
      message: 'Invitation accepted and account activated successfully',
      email: user.email,
    };
  }
}
