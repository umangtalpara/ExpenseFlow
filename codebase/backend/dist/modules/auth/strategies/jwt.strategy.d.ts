import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { UserDocument } from '../../users/schemas/user.schema';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly userModel;
    constructor(configService: ConfigService, userModel: Model<UserDocument>);
    validate(payload: any): Promise<{
        id: string;
        email: string;
        role: import("../../users/schemas/user.schema").UserRole;
        organizationId: string | null;
    }>;
}
export {};
