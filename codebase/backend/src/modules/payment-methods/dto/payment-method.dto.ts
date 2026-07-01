import { IsNotEmpty, IsString, IsOptional, IsEnum, Matches } from 'class-validator';
import { PaymentMethodType, PaymentMethodStatus } from '../schemas/payment-method.schema';

export class CreatePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code must contain only uppercase alphanumeric characters, underscores, or hyphens' })
  code: string;

  @IsEnum(PaymentMethodType)
  @IsNotEmpty()
  type: PaymentMethodType;

  @IsEnum(PaymentMethodStatus)
  @IsOptional()
  status?: PaymentMethodStatus;
}

export class UpdatePaymentMethodDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code must contain only uppercase alphanumeric characters, underscores, or hyphens' })
  code?: string;

  @IsEnum(PaymentMethodType)
  @IsOptional()
  type?: PaymentMethodType;

  @IsEnum(PaymentMethodStatus)
  @IsOptional()
  status?: PaymentMethodStatus;
}
