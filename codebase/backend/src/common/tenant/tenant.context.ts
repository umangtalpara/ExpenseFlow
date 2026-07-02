import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextStore {
  organizationId: string;
  userId?: string;
}

export const tenantLocalStorage = new AsyncLocalStorage<TenantContextStore>();

/**
 * Gets the current request's tenant (organization) ID.
 */
export function getTenantId(): string | undefined {
  const store = tenantLocalStorage.getStore();
  return store?.organizationId;
}

/**
 * Runs a function within the context of a tenant.
 */
export function runWithTenant(organizationId: string, callback: () => void): void {
  tenantLocalStorage.run({ organizationId }, callback);
}
