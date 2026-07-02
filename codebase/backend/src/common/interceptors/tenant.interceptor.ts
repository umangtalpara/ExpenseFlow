import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantLocalStorage } from '../tenant/tenant.context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Check if user is authenticated (populated by JwtAuthGuard), otherwise fall back to headers
    const user = request.user;
    const tenantIdHeader = request.headers['x-tenant-id'] || request.headers['x-organization-id'];
    const tenantId = user?.organization?.toString() || (Array.isArray(tenantIdHeader) ? tenantIdHeader[0] : tenantIdHeader);

    if (tenantId) {
      return new Observable((subscriber) => {
        tenantLocalStorage.run({ organizationId: tenantId, userId: user?.id }, () => {
          next.handle().subscribe(subscriber);
        });
      });
    }

    return next.handle();
  }
}
