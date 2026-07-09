import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OrganizationRepository } from '../organizations/repositories/organization.repository';
import { UserRepository } from '../users/repositories/user.repository';
import { RoleRepository } from '../roles/repositories/role.repository';
import { PermissionRepository } from '../permissions/repositories/permission.repository';
import { OrganizationStatus } from '../organizations/schemas/organization.schema';
import { UserStatus } from '../users/schemas/user.schema';
import { runWithTenant } from '../../common/tenant/tenant.context';
import { LoginDto, SignupDto, ResetPasswordDto } from './dto/auth.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UserSession, UserSessionDocument } from './schemas/session.schema';
import { TotpHelper } from './helpers/totp.helper';
import { MailService } from '../mail/mail.service';

const DEFAULT_PERMISSIONS = [
  { name: 'expenses:create', description: 'Create expense claims' },
  { name: 'expenses:view', description: 'View expense claims' },
  { name: 'expenses:approve', description: 'Approve or reject expense claims' },
  { name: 'projects:manage', description: 'Manage projects and assignments' },
  { name: 'users:manage', description: 'Manage organization users and invitations' },
  { name: 'reimbursements:manage', description: 'Manage reimbursements and payouts' },
  { name: 'audit-logs:view', description: 'View audit logs' },
];

@Injectable()
export class AuthService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
    private readonly mailService: MailService,
    @InjectModel(UserSession.name)
    private readonly sessionModel: Model<UserSessionDocument>,
  ) { }

  async signup(dto: SignupDto) {
    const existingOrg = await this.organizationRepository.findOne({ slug: dto.orgSlug });
    if (existingOrg) {
      throw new ConflictException('Organization slug is already taken');
    }

    const existingUser = await this.userRepository.findOne({ email: dto.email }, { bypassTenantIsolation: true });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // 1. Create Organization
    const org = await this.organizationRepository.create({
      name: dto.orgName,
      slug: dto.orgSlug,
      status: OrganizationStatus.ACTIVE,
      currency: dto.currency || 'USD',
    });
    const orgId = org._id.toString();

    // 2. Seed Global Permissions
    const permissionDocs: any[] = [];
    for (const perm of DEFAULT_PERMISSIONS) {
      let doc = await this.permissionRepository.findOne({ name: perm.name });
      if (!doc) {
        doc = await this.permissionRepository.create(perm);
      }
      permissionDocs.push(doc);
    }

    // 3. Create Tenant-scoped Roles and Admin User within the Tenant context
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    let user: any;
    let adminRole: any;

    await new Promise<void>((resolve, reject) => {
      runWithTenant(orgId, async () => {
        try {
          adminRole = await this.roleRepository.create({
            name: 'Organization Admin',
            organization: org._id,
            permissions: permissionDocs.map((p) => p._id),
            description: 'Full administrative access',
          });

          await this.roleRepository.create({
            name: 'Project Manager',
            organization: org._id,
            permissions: permissionDocs.filter((p) => ['expenses:create', 'expenses:view', 'expenses:approve', 'projects:manage'].includes(p.name)).map((p) => p._id),
            description: 'Manage assigned projects and approve expenses',
          });

          await this.roleRepository.create({
            name: 'Employee',
            organization: org._id,
            permissions: permissionDocs.filter((p) => ['expenses:create', 'expenses:view'].includes(p.name)).map((p) => p._id),
            description: 'Submit and view own expense claims',
          });

          user = await this.userRepository.create({
            email: dto.email,
            name: dto.name,
            password: hashedPassword,
            organization: org._id,
            role: adminRole._id,
            status: UserStatus.ACTIVE,
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    await this.auditLogsService.log({
      action: 'SIGNUP',
      entityType: 'User',
      entityId: user._id.toString(),
      organizationId: orgId,
      userId: user._id.toString(),
      details: { email: user.email, name: user.name },
    });

    return this.createSessionAndGenerateTokens(user);
  }

  async login(dto: LoginDto, ip?: string, ua?: string) {
    const user = await this.userRepository.findOne({ email: dto.email }, { bypassTenantIsolation: true }, '+password +twoFactorSecret');
    if (!user || user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2FA Check
    if (user.isTwoFactorEnabled) {
      const secret = this.configService.get<string>('JWT_SECRET') || 'fallback_secret_32_characters_long_minimum';
      const tempToken = this.jwtService.sign(
        { sub: user._id.toString(), isTemp: true },
        {
          secret,
          expiresIn: '5m',
        } as any,
      );

      return {
        is2faRequired: true,
        tempToken,
      };
    }

    await this.auditLogsService.log({
      action: 'LOGIN',
      entityType: 'User',
      entityId: user._id.toString(),
      organizationId: user.organization.toString(),
      userId: user._id.toString(),
      details: { email: user.email },
    });

    return this.createSessionAndGenerateTokens(user, ip, ua);
  }

  async logout(user: any, sessionId?: string) {
    if (sessionId) {
      await this.sessionModel.findByIdAndUpdate(sessionId, { status: 'revoked' }).setOptions({ bypassTenantIsolation: true }).exec();
    }
    await this.auditLogsService.log({
      action: 'LOGOUT',
      entityType: 'User',
      entityId: user.id,
      organizationId: user.organization,
      userId: user.id,
      details: { email: user.email, sessionId },
    });
  }

  async refreshToken(token: string) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET') || 'fallback_secret_32_characters_long_minimum';
      const payload = this.jwtService.verify(token, { secret });
      const user = await this.userRepository.findOne({ _id: payload.sub }, { bypassTenantIsolation: true });
      if (!user || user.status === UserStatus.DISABLED) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if session is revoked
      if (payload.sid) {
        const session = await this.sessionModel.findById(payload.sid).setOptions({ bypassTenantIsolation: true }).exec();
        if (!session || session.status === 'revoked') {
          throw new UnauthorizedException('Session has been revoked');
        }
      }

      return this.generateTokens(user, payload.sid);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(email: string, frontendUrl?: string): Promise<{ token: string; message: string }> {
    const user = await this.userRepository.findOne({ email }, { bypassTenantIsolation: true });
    if (!user) {
      // Return a dummy token for testing if user doesn't exist, or just message
      return { token: '', message: 'Password reset instructions sent if email exists' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry

    await new Promise<void>((resolve, reject) => {
      runWithTenant(user.organization.toString(), async () => {
        try {
          await user.save();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    await this.mailService.sendPasswordResetMail(user.email, token, frontendUrl);

    console.log(`[RESET PASSWORD] Token for ${email}: ${token}`);
    return { token, message: 'Password reset instructions sent if email exists' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne(
      {
        resetPasswordToken: dto.token,
        resetPasswordExpires: { $gt: new Date() },
      },
      { bypassTenantIsolation: true }
    );

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await new Promise<void>((resolve, reject) => {
      runWithTenant(user.organization.toString(), async () => {
        try {
          await user.save();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    return { message: 'Password has been reset successfully' };
  }

  // --- Two-Factor Authentication (2FA) ---

  async generate2faSecret(userId: string) {
    const user = await this.userRepository.findOne({ _id: userId }, { bypassTenantIsolation: true });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = TotpHelper.generateSecret();
    const otpauthUrl = `otpauth://totp/ExpenseFlow:${user.email}?secret=${secret}&issuer=ExpenseFlow`;

    return {
      secret,
      otpauthUrl,
    };
  }

  async enable2fa(userId: string, secret: string, code: string) {
    const isValid = TotpHelper.verifyCode(secret, code);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.userRepository.update(userId, {
      twoFactorSecret: secret,
      isTwoFactorEnabled: true,
    }, { bypassTenantIsolation: true });

    return { message: 'Two-Factor Authentication enabled successfully' };
  }

  async disable2fa(userId: string, code: string) {
    const user = await this.userRepository.findOne({ _id: userId }, { bypassTenantIsolation: true }, '+twoFactorSecret');
    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Two-Factor Authentication is not enabled');
    }

    const isValid = TotpHelper.verifyCode(user.twoFactorSecret, code);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.userRepository.update(userId, {
      isTwoFactorEnabled: false,
    }, { bypassTenantIsolation: true });

    // Remove secret from DB
    await this.userRepository.update(userId, { twoFactorSecret: undefined } as any, { bypassTenantIsolation: true });

    return { message: 'Two-Factor Authentication disabled successfully' };
  }

  async verify2faLogin(tempToken: string, code: string, ip?: string, ua?: string) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET') || 'fallback_secret_32_characters_long_minimum';
      const payload = this.jwtService.verify(tempToken, { secret });

      if (!payload.isTemp) {
        throw new BadRequestException('Invalid verification token');
      }

      const user = await this.userRepository.findOne({ _id: payload.sub }, { bypassTenantIsolation: true }, '+twoFactorSecret');
      if (!user || !user.twoFactorSecret) {
        throw new BadRequestException('2FA configuration not found');
      }

      const isValid = TotpHelper.verifyCode(user.twoFactorSecret, code);
      if (!isValid) {
        throw new UnauthorizedException('Invalid verification code');
      }

      await this.auditLogsService.log({
        action: 'LOGIN_2FA',
        entityType: 'User',
        entityId: user._id.toString(),
        organizationId: user.organization.toString(),
        userId: user._id.toString(),
        details: { email: user.email },
      });

      return this.createSessionAndGenerateTokens(user, ip, ua);
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Invalid 2FA login verification');
    }
  }

  // --- Session Management ---

  private async createSessionAndGenerateTokens(user: any, ip?: string, ua?: string) {
    let session: any;
    await new Promise<void>((resolve, reject) => {
      runWithTenant(user.organization.toString(), async () => {
        try {
          session = await this.sessionModel.create({
            user: user._id,
            ipAddress: ip || '127.0.0.1',
            userAgent: ua || 'Unknown Device',
            status: 'active',
            organization: user.organization,
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    const tokens = await this.generateTokens(user, session._id.toString());
    return {
      ...tokens,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role.toString(),
        organization: user.organization.toString(),
      },
    };
  }

  async getActiveSessions(userId: string) {
    return this.sessionModel.find({ user: new Types.ObjectId(userId), status: 'active' }).sort({ updatedAt: -1 }).exec();
  }

  async revokeSession(sessionId: string, userId: string) {
    const session = await this.sessionModel.findOneAndUpdate(
      { _id: new Types.ObjectId(sessionId), user: new Types.ObjectId(userId) },
      { status: 'revoked' },
      { new: true }
    ).exec();

    if (!session) {
      throw new NotFoundException('Session not found or access denied');
    }
    return { message: 'Session revoked successfully' };
  }

  async revokeAllOtherSessions(userId: string, currentSessionId?: string) {
    const filter: any = { user: new Types.ObjectId(userId), status: 'active' };
    if (currentSessionId) {
      filter._id = { $ne: new Types.ObjectId(currentSessionId) };
    }
    await this.sessionModel.updateMany(filter, { status: 'revoked' }).exec();
    return { message: 'All other sessions revoked successfully' };
  }

  // Helper method for token generation
  private async generateTokens(user: any, sessionId?: string) {
    let roleName = 'Employee';
    if (user.role) {
      if (typeof user.role === 'object' && user.role.name) {
        roleName = user.role.name;
      } else {
        const role = await this.roleRepository.findOne({ _id: user.role }, { bypassTenantIsolation: true });
        if (role) {
          roleName = role.name;
        }
      }
    }

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      org: user.organization.toString(),
      role: roleName,
      sid: sessionId,
    };

    const secret = this.configService.get<string>('JWT_SECRET') || 'fallback_secret_32_characters_long_minimum';
    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m',
    } as any);
    const refreshToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d',
    } as any);

    return { accessToken, refreshToken };
  }
}
