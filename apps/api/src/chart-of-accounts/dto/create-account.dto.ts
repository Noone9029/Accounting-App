import { AccountType } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateAccountDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  allowPosting?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
