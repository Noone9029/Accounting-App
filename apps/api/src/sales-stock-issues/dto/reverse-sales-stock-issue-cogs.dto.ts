import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReverseSalesStockIssueCogsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
