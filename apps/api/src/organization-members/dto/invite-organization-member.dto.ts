import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class InviteOrganizationMemberDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsUUID()
  roleId!: string;
}
