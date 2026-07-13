import { IsIn, IsOptional } from "class-validator";

export class ExportAccountingCloseEvidenceDto {
  @IsOptional()
  @IsIn(["json", "csv"])
  format?: "json" | "csv";
}
