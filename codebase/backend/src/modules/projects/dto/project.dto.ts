import { IsNotEmpty, IsString, IsOptional, IsNumber, IsEnum, IsDateString, IsArray, Matches, IsBoolean } from 'class-validator';
import { ProjectStatus } from '../schemas/project.schema';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code must contain only uppercase alphanumeric characters, underscores, or hyphens' })
  code: string;

  @IsString()
  @IsNotEmpty()
  client: string;

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsString()
  @IsOptional()
  approvalFlow?: string;

  @IsBoolean()
  @IsOptional()
  bypassBudgetLimit?: boolean;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code must contain only uppercase alphanumeric characters, underscores, or hyphens' })
  code?: string;

  @IsString()
  @IsOptional()
  client?: string;

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsString()
  @IsOptional()
  approvalFlow?: string;

  @IsBoolean()
  @IsOptional()
  bypassBudgetLimit?: boolean;
}

export class AssignMembersDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

export class AssignManagersDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}
