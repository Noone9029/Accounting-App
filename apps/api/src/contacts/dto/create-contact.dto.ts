import { ContactType } from "@prisma/client";
import { IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, Length, Matches, MaxLength, ValidateIf } from "class-validator";

export const contactIdentificationTypes = ["CRN", "MOM", "MLS", "SAG", "NAT", "IQA", "PAS", "GCC", "700", "OTH"] as const;

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
  @Matches(/^[0-9]{15}$/, { message: "taxNumber must be exactly 15 digits." })
  taxNumber?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{15}$/, { message: "uaeTrn must be exactly 15 digits." })
  uaeTrn?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: "uaeTin must be exactly 10 digits." })
  uaeTin?: string;

  @IsOptional()
  @IsString()
  uaeVatRegistrationStatus?: string;

  @IsOptional()
  @IsString()
  uaeAddressLine1?: string;

  @IsOptional()
  @IsString()
  uaeAddressLine2?: string;

  @IsOptional()
  @IsString()
  uaeEmirate?: string;

  @IsOptional()
  @IsString()
  peppolParticipantId?: string;

  @IsOptional()
  @IsString()
  peppolEndpointStatus?: string;

  @IsOptional()
  @IsString()
  preferredEinvoiceDeliveryMethod?: string;

  @IsOptional()
  @IsString()
  @IsIn(contactIdentificationTypes, { message: "identificationType must be one of CRN, MOM, MLS, SAG, NAT, IQA, PAS, GCC, 700, or OTH." })
  identificationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9]+$/, { message: "identificationNumber must contain only letters and digits." })
  identificationNumber?: string;

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
