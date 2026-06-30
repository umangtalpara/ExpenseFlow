import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  orgName: string;

  @IsString()
  @IsNotEmpty()
  orgSlug: string;

  @IsString()
  @IsNotEmpty()
  adminName: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
