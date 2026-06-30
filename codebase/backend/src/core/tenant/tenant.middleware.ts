import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantService: TenantService,
    private readonly jwtService: JwtService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    let tenantId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = this.jwtService.decode(token) as any;
        tenantId = decoded?.organizationId || decoded?.organization || null;
      } catch {
        // Ignore decode errors
      }
    }

    if (!tenantId) {
      tenantId = (req.headers['x-tenant-id'] as string) || null;
    }

    if (tenantId) {
      this.tenantService.enterTenant(tenantId);
    }
    next();
  }
}
