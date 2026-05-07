import { IsBoolean, IsOptional, IsString, ValidateIf } from "class-validator";

export class UpdateOrganizationDocumentSettingsDto {
  @IsOptional()
  @IsString()
  invoiceTitle?: string;

  @IsOptional()
  @IsString()
  receiptTitle?: string;

  @IsOptional()
  @IsString()
  statementTitle?: string;

  @IsOptional()
  @IsString()
  footerText?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  primaryColor?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  accentColor?: string | null;

  @IsOptional()
  @IsBoolean()
  showTaxNumber?: boolean;

  @IsOptional()
  @IsBoolean()
  showPaymentSummary?: boolean;

  @IsOptional()
  @IsBoolean()
  showNotes?: boolean;

  @IsOptional()
  @IsBoolean()
  showTerms?: boolean;

  @IsOptional()
  @IsString()
  defaultInvoiceTemplate?: string;

  @IsOptional()
  @IsString()
  defaultReceiptTemplate?: string;

  @IsOptional()
  @IsString()
  defaultStatementTemplate?: string;
}
