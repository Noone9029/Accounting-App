import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AcceptInvitationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
