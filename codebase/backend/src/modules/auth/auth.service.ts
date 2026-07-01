import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
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

const DEFAULT_PERMISSIONS = [
  { name: 'expenses:create', description: 'Create expense claims' },
  { name: 'expenses:view', description: 'View expense claims' },
  { name: 'expenses:approve', description: 'Approve or reject expense claims' },
  { name: 'projects:manage', description: 'Manage projects and assignments' },
  { name: 'users:manage', description: 'Manage organization users and invitations' },
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
    });
    const orgId = org._id.toString();

    // 2. Seed Global Permissions
    const permissionDocs = [];
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

    return this.generateTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({ email: dto.email }, { bypassTenantIsolation: true }, '+password');
    if (!user || user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async refreshToken(token: string) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET') || 'fallback_secret_32_characters_long_minimum';
      const payload = this.jwtService.verify(token, { secret });
      const user = await this.userRepository.findOne({ _id: payload.sub }, { bypassTenantIsolation: true });
      if (!user || user.status === UserStatus.DISABLED) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ email }, { bypassTenantIsolation: true });
    if (!user) {
      // Return simulated success to avoid user enumeration
      return { message: 'Password reset instructions sent if email exists' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry

    // Save with tenant context wrapped
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

    console.log(`[RESET PASSWORD] Token for ${email}: ${token}`);
    return { token, message: 'Password reset token generated' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      resetPasswordToken: dto.token,
      resetPasswordExpires: { $gt: new Date() },
    }, { bypassTenantIsolation: true });

    if (!user) {
      throw new BadRequestException('Password reset token is invalid or has expired');
    }

    console.log('RESET PASSWORD USER:', JSON.stringify(user));

    user.password = await bcrypt.hash(dto.password, 12);
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

  private async generateTokens(user: any) {
    const payload = { sub: user._id.toString(), email: user.email };
    const secret = this.configService.get<string>('JWT_SECRET') || 'fallback_secret_32_characters_long_minimum';
    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d',
    });
    return { accessToken, refreshToken };
  }
}
