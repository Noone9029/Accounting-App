import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateZatcaCsrFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  csrCommonName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  csrSerialNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  csrOrganizationUnitName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  csrInvoiceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  csrLocationAddress?: string;
}
