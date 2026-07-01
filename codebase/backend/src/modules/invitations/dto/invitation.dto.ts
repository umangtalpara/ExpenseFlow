import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;
}

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(6)
  password: string;
}
