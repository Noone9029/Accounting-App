import { IsIn, IsOptional, IsString } from "class-validator";

export class ValidateZatcaSdkXmlDto {
  @IsOptional()
  @IsString()
  xmlBase64?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsIn(["dry-run"])
  mode?: "dry-run";
}
