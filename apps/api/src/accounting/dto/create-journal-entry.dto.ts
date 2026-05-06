import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsISO8601, IsOptional, IsString, ValidateNested } from "class-validator";
import { JournalLineDto } from "./journal-line.dto";

export class CreateJournalEntryDto {
  @IsISO8601()
  entryDate!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}
