import { IsNotEmpty, IsEnum, IsString, IsOptional } from 'class-validator';
import { ApprovalAction } from '../schemas/approval-request.schema';

export class ApprovalActionDto {
  @IsEnum(ApprovalAction)
  @IsNotEmpty()
  action: ApprovalAction;

  @IsString()
  @IsOptional()
  comment?: string;
}
