import { IsNotEmpty, IsString, IsOptional, IsEnum, Matches, IsBoolean, IsNumber, Min } from 'class-validator';
import { CategoryStatus } from '../schemas/category.schema';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code must contain only uppercase alphanumeric characters, underscores, or hyphens' })
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;

  @IsBoolean()
  @IsOptional()
  requireReceipt?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxLimit?: number;
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code must contain only uppercase alphanumeric characters, underscores, or hyphens' })
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;

  @IsBoolean()
  @IsOptional()
  requireReceipt?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxLimit?: number;
}
