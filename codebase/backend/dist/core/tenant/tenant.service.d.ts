export interface TenantStore {
    tenantId: string;
}
export declare class TenantService {
    private readonly als;
    runWithTenant<T>(tenantId: string, callback: () => T): T;
    getTenantId(): string | null;
}
