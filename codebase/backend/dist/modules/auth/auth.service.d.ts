import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { OrganizationDocument } from '../organizations/schemas/organization.schema';
import { UserDocument, UserRole } from '../users/schemas/user.schema';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { InviteUserDto } from './dto/invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
export declare class AuthService {
    private readonly orgModel;
    private readonly userModel;
    private readonly jwtService;
    constructor(orgModel: Model<OrganizationDocument>, userModel: Model<UserDocument>, jwtService: JwtService);
    signup(dto: SignupDto): Promise<{
        message: string;
        organizationId: string;
        userId: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: UserRole;
            organizationId: string | null;
        };
    }>;
    refresh(token: string): Promise<{
        accessToken: string;
    }>;
    invite(dto: InviteUserDto, currentUser: any): Promise<{
        message: string;
        inviteToken: string;
        inviteLink: string;
    }>;
    acceptInvite(dto: AcceptInviteDto): Promise<{
        message: string;
        email: string;
    }>;
}
