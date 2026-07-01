import { IsNotEmpty, IsString, IsOptional, IsEmail, IsArray, IsEnum } from 'class-validator';
import { VendorStatus } from '../schemas/vendor.schema';

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsOptional()
  gstPan?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccount?: string;

  @IsString()
  @IsOptional()
  bankIfsc?: string;

  @IsEnum(VendorStatus)
  @IsOptional()
  status?: VendorStatus;
}

export class UpdateVendorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  gstPan?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccount?: string;

  @IsString()
  @IsOptional()
  bankIfsc?: string;

  @IsEnum(VendorStatus)
  @IsOptional()
  status?: VendorStatus;
}

export class LinkProjectsDto {
  @IsArray()
  @IsString({ each: true })
  projectIds: string[];
}
