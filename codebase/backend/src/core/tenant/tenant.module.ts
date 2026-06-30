import { Module, Global } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantInterceptor } from './tenant.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Global()
@Module({
  providers: [
    TenantService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
  exports: [TenantService],
})
export class TenantModule {}
