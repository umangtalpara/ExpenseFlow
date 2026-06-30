import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
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
            role: import("../users/schemas/user.schema").UserRole;
            organizationId: string | null;
        };
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
    }>;
}
