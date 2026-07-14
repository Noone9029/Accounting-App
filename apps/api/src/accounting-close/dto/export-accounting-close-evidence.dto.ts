import { IsIn, IsOptional } from "class-validator";

export class ExportAccountingCloseEvidenceDto {
  @IsOptional()
  @IsIn(["json", "csv", "pdf"])
  format?: "json" | "csv" | "pdf";
}
