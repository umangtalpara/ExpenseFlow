import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantLocalStorage } from './tenant.context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const tenantIdHeader = req.headers['x-tenant-id'] || req.headers['x-organization-id'];
    
    // Express headers are either string or string[]
    const tenantId = Array.isArray(tenantIdHeader) ? tenantIdHeader[0] : tenantIdHeader;

    if (tenantId) {
      tenantLocalStorage.run({ organizationId: tenantId }, () => {
        next();
      });
    } else {
      next();
    }
  }
}
