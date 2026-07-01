import { IsNotEmpty, IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowStatus } from '../schemas/approval-workflow.schema';

export class WorkflowConditionsDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxAmount?: number;

  @IsString()
  @IsOptional()
  category?: string;
}

export class ApprovalStepDto {
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  stepNumber: number;

  @IsString()
  @IsOptional()
  approverRole?: string;

  @IsString()
  @IsOptional()
  approverUser?: string;
}

export class CreateApprovalWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(WorkflowStatus)
  @IsOptional()
  status?: WorkflowStatus;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowConditionsDto)
  conditions?: WorkflowConditionsDto;

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  steps: ApprovalStepDto[];
}

export class UpdateApprovalWorkflowDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(WorkflowStatus)
  @IsOptional()
  status?: WorkflowStatus;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowConditionsDto)
  conditions?: WorkflowConditionsDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  steps?: ApprovalStepDto[];
}
