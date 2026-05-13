import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsDateString, IsOptional, IsString, ValidateNested } from "class-validator";

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
  debit?: string;

  @IsOptional()
  @IsString()
  credit?: string;
}

export class CreateBankStatementImportDto {
  @IsString()
  filename!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BankStatementImportRowDto)
  rows!: BankStatementImportRowDto[];

  @IsOptional()
  @IsString()
  openingStatementBalance?: string;

  @IsOptional()
  @IsString()
  closingStatementBalance?: string;
}
