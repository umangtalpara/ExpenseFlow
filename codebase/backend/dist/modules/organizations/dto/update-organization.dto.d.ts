declare class FinancialYearDto {
    startMonth: number;
    endMonth: number;
}
declare class TaxSettingsDto {
    taxId?: string;
    taxName?: string;
    taxRate?: number;
}
export declare class UpdateOrganizationDto {
    name?: string;
    currency?: string;
    timezone?: string;
    financialYear?: FinancialYearDto;
    taxSettings?: TaxSettingsDto;
}
export {};
