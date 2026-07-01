import { IsNotEmpty, IsString, IsOptional, Matches } from 'class-validator';

export class CreateDesignationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code must contain only uppercase alphanumeric characters, underscores, or hyphens' })
  code: string;
}

export class UpdateDesignationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code must contain only uppercase alphanumeric characters, underscores, or hyphens' })
  code?: string;
}
