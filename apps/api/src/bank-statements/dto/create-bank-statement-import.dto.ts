import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsOptional, IsString, ValidateNested } from "class-validator";

export class BankStatementImportRowDto {
  @IsDateString()
  date!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  bankReference?: string;

  @IsOptional()
  @IsString()
  debit?: string;

  @IsOptional()
  @IsString()
  credit?: string;

  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  balance?: string;

  @IsOptional()
  @IsString()
  counterparty?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class CreateBankStatementImportDto {
  @IsString()
  filename!: string;

  @IsOptional()
  @IsString()
  csvText?: string;

  @IsOptional()
  @IsString()
  xlsxBase64?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankStatementImportRowDto)
  rows?: BankStatementImportRowDto[];

  @IsOptional()
  @IsBoolean()
  allowPartial?: boolean;

  @IsOptional()
  @IsString()
  openingStatementBalance?: string;

  @IsOptional()
  @IsString()
  closingStatementBalance?: string;
}

export class PreviewBankStatementImportDto {
  @IsString()
  filename!: string;

  @IsOptional()
  @IsString()
  csvText?: string;

  @IsOptional()
  @IsString()
  xlsxBase64?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankStatementImportRowDto)
  rows?: BankStatementImportRowDto[];
}
