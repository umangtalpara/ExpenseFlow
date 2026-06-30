import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: string;
}

@Injectable()
export class TenantService {
  private readonly als = new AsyncLocalStorage<TenantStore>();

  runWithTenant<T>(tenantId: string, callback: () => T): T {
    return this.als.run({ tenantId }, callback);
  }

  enterTenant(tenantId: string): void {
    this.als.enterWith({ tenantId });
  }

  getTenantId(): string | null {
    const store = this.als.getStore();
    return store ? store.tenantId : null;
  }
}
