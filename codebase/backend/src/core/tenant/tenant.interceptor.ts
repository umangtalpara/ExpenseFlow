import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantService } from './tenant.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantService: TenantService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // 1. Try to get tenantId from Jwt user payload (organizationId or organization field)
    // 2. Try x-tenant-id header (for super admin override or development)
    const tenantId =
      request.user?.organizationId ||
      request.user?.organization ||
      request.headers['x-tenant-id'] ||
      null;

    if (tenantId) {
      return new Observable((subscriber) => {
        this.tenantService.runWithTenant(tenantId, () => {
          next.handle().subscribe(subscriber);
        });
      });
    }

    return next.handle();
  }
}
