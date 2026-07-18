import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString, IsEnum, Min, IsArray } from 'class-validator';
import { ExpenseStatus } from '../schemas/expense.schema';

export class CreateExpenseDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsString()
  @IsOptional()
  project?: string;

  @IsString()
  @IsNotEmpty()
  merchant: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  receiptUrl?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  gst?: number;

  @IsString()
  @IsOptional()
  vendor?: string;

  @IsEnum(ExpenseStatus)
  @IsOptional()
  status?: ExpenseStatus;

  @IsString()
  @IsOptional()
  employee?: string;

  @IsOptional()
  requestReimbursement?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  receiptUrls?: string[];
}

export class UpdateExpenseDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  project?: string;

  @IsString()
  @IsOptional()
  merchant?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  receiptUrl?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  gst?: number;

  @IsString()
  @IsOptional()
  vendor?: string;

  @IsEnum(ExpenseStatus)
  @IsOptional()
  status?: ExpenseStatus;

  @IsOptional()
  requestReimbursement?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  receiptUrls?: string[];
}
