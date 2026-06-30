import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';
import { JwtService } from '@nestjs/jwt';
export declare class TenantMiddleware implements NestMiddleware {
    private readonly tenantService;
    private readonly jwtService;
    constructor(tenantService: TenantService, jwtService: JwtService);
    use(req: Request, res: Response, next: NextFunction): void;
}
