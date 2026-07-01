import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { InvitationRepository } from './repositories/invitation.repository';
import { InvitationStatus } from './schemas/invitation.schema';
import { UserRepository } from '../users/repositories/user.repository';
import { RoleRepository } from '../roles/repositories/role.repository';
import { OrganizationRepository } from '../organizations/repositories/organization.repository';
import { UserStatus } from '../users/schemas/user.schema';
import { runWithTenant } from '../../common/tenant/tenant.context';
import { CreateInvitationDto, AcceptInvitationDto } from './dto/invitation.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class InvitationService {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly authService: AuthService,
  ) {}

  async createInvitation(dto: CreateInvitationDto, adminOrgId: string) {
    // 1. Check if user already exists
    const existingUser = await this.userRepository.findOne({ email: dto.email }, { bypassTenantIsolation: true });
    if (existingUser) {
      throw new ConflictException('User with this email is already registered');
    }

    // 2. Check if role exists and belongs to the same organization
    const role = await this.roleRepository.findOne({ _id: dto.roleId });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // 3. Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 4. Create Invitation
    let invitation: any;
    await new Promise<void>((resolve, reject) => {
      runWithTenant(adminOrgId, async () => {
        try {
          // Deactivate any existing pending invitations for this email + organization
          const pending = await this.invitationRepository.findOne({
            email: dto.email,
            status: InvitationStatus.PENDING,
          });
          if (pending) {
            pending.status = InvitationStatus.EXPIRED;
            await pending.save();
          }

          invitation = await this.invitationRepository.create({
            email: dto.email,
            organization: new Object(adminOrgId) as any,
            role: role._id,
            token,
            status: InvitationStatus.PENDING,
            expiresAt,
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    console.log(`[INVITATION] Sent invite to ${dto.email}: /accept-invite?token=${token}`);
    return {
      token,
      message: 'Invitation link generated successfully',
    };
  }

  async verifyToken(token: string) {
    const invite = await this.invitationRepository.findOne({ token, status: InvitationStatus.PENDING }, { bypassTenantIsolation: true });
    
    if (!invite || invite.expiresAt < new Date()) {
      if (invite && invite.expiresAt < new Date()) {
        invite.status = InvitationStatus.EXPIRED;
        await invite.save();
      }
      throw new BadRequestException('Invitation token is invalid or has expired');
    }

    // Fetch org and role info to return to client
    const org = await this.organizationRepository.findOne({ _id: invite.organization }, { bypassTenantIsolation: true });
    const role = await this.roleRepository.findOne({ _id: invite.role }, { bypassTenantIsolation: true });

    return {
      email: invite.email,
      organizationName: org?.name,
      roleName: role?.name,
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const invite = await this.invitationRepository.findOne({
      token: dto.token,
      status: InvitationStatus.PENDING,
    }, { bypassTenantIsolation: true });

    if (!invite || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invitation token is invalid or has expired');
    }

    // Double check email registration
    const existingUser = await this.userRepository.findOne({ email: invite.email }, { bypassTenantIsolation: true });
    if (existingUser) {
      throw new ConflictException('User with this email is already registered');
    }

    // Create User inside Tenant Context
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const orgId = invite.organization.toString();
    
    let user: any;
    await new Promise<void>((resolve, reject) => {
      runWithTenant(orgId, async () => {
        try {
          user = await this.userRepository.create({
            email: invite.email,
            name: dto.name,
            password: hashedPassword,
            organization: invite.organization,
            role: invite.role,
            status: UserStatus.ACTIVE,
          });

          // Mark invitation accepted
          invite.status = InvitationStatus.ACCEPTED;
          await invite.save();

          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    // Authenticate and issue JWT tokens for the onboarding user
    // Since generateTokens is private, we can call a custom public wrapper in AuthService,
    // or AuthService already exports its token generators via authentication, but let's see.
    // In our AuthService, generateTokens is private, but login and signup return tokens.
    // Let's check how to generate tokens.
    // Ah, wait! In AuthService we had generateTokens as a private method:
    // `private async generateTokens(user: any)`
    // Let's modify AuthService to make `generateTokens` public or call it!
    // Or we can just login the user immediately using their credentials, or we can use JwtService directly in InvitationService, or make generateTokens public.
    // Actually, making `generateTokens` public or creating a public method `loginUserDirectly(user)` in AuthService is extremely clean.
    // Let's check: we can just use `jwtService` in InvitationService directly to sign the payload, OR make `generateTokens` public.
    // Let's just make it public in AuthService, or write the sign logic here.
    // Since InvitationService has jwtService and configService, we can just sign it here. But to keep it DRY, we can call a method on AuthService!
    // Wait, let's verify if we can make generateTokens public. Yes! We can modify AuthService to make `generateTokens(user)` public!
    // Wait, did we define `private async generateTokens` in AuthService?
    // Let's check: yes, we wrote:
    // `private async generateTokens(user: any)`
    // We can change it to public `async generateTokens(user: any)`!
    // Wait! Let's check if we can make it public. Yes, let's change `private async generateTokens` to `async generateTokens` in AuthService in a later edit or just write the token generation here. Let's make it public in AuthService for elegance.
    
    const payload = { sub: user._id.toString(), email: user.email };
    // We will generate the tokens right here to avoid circular imports or direct edits.
    // We need JwtService and ConfigService which we will inject.
    return this.authService.login({ email: invite.email, password: dto.password });
  }
}
