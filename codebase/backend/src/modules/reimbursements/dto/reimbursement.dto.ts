import { IsString, IsArray, IsOptional, IsNotEmpty, IsDateString, IsMongoId } from 'class-validator';

export class CreateReimbursementDto {
  @IsString()
  @IsNotEmpty()
  batchName: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  expenseIds?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class PayReimbursementDto {
  @IsMongoId()
  @IsNotEmpty()
  paymentMethodId: string;

  @IsString()
  @IsNotEmpty()
  referenceNumber: string;

  @IsDateString()
  @IsNotEmpty()
  payoutDate: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
