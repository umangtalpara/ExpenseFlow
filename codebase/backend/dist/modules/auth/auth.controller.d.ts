import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { InviteUserDto } from './dto/invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UserRole } from '../users/schemas/user.schema';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    refresh(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    invite(dto: InviteUserDto, req: any): Promise<{
        message: string;
        inviteToken: string;
        inviteLink: string;
    }>;
    acceptInvite(dto: AcceptInviteDto): Promise<{
        message: string;
        email: string;
    }>;
}
