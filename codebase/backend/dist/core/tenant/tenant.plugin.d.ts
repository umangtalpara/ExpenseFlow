import { Schema } from 'mongoose';
import { TenantService } from './tenant.service';
export interface TenantPluginOptions {
    tenantService: TenantService;
}
export declare function tenantPlugin(schema: Schema, options: TenantPluginOptions): void;
