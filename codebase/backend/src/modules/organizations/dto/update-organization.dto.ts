import { IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FinancialYearDto {
  @IsNumber()
  @Min(1)
  @Max(12)
  startMonth: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  endMonth: number;
}

class TaxSettingsDto {
  @IsString()
  @IsOptional()
  taxId?: string;

  @IsString()
  @IsOptional()
  taxName?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  taxRate?: number;
}

export class UpdateOrganizationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @ValidateNested()
  @Type(() => FinancialYearDto)
  @IsOptional()
  financialYear?: FinancialYearDto;

  @ValidateNested()
  @Type(() => TaxSettingsDto)
  @IsOptional()
  taxSettings?: TaxSettingsDto;
}
