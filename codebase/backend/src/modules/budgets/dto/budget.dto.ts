import { IsNotEmpty, IsEnum, IsNumber, IsString, IsOptional, IsDateString, IsArray, Min } from 'class-validator';
import { BudgetScope, BudgetStatus } from '../schemas/budget.schema';

export class CreateBudgetDto {
  @IsEnum(BudgetScope)
  @IsNotEmpty()
  scope: BudgetScope;

  @IsString()
  @IsOptional()
  project?: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  thresholds?: number[];
}

export class UpdateBudgetDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  thresholds?: number[];

  @IsEnum(BudgetStatus)
  @IsOptional()
  status?: BudgetStatus;
}

export class UpdateSpentDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;
}
