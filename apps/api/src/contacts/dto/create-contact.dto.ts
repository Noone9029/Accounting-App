import { ContactType } from "@prisma/client";
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Length } from "class-validator";

export class CreateContactDto {
  @IsEnum(ContactType)
  type!: ContactType;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
