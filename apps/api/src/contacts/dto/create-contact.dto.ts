import { ContactType } from "@prisma/client";
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Length, Matches, MaxLength, ValidateIf } from "class-validator";

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
  @ValidateIf((contact: CreateContactDto) => contact.buildingNumber !== undefined && String(contact.countryCode ?? "SA").toUpperCase() === "SA")
  @Matches(/^[0-9]{4}$/, { message: "buildingNumber must be 4 digits for Saudi buyer addresses." })
  buildingNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(127)
  district?: string;

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
