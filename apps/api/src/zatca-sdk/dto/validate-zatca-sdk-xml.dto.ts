import { IsIn, IsOptional, IsString } from "class-validator";

export class ValidateZatcaSdkXmlDto {
  @IsOptional()
  @IsString()
  xml?: string;

  @IsOptional()
  @IsString()
  xmlBase64?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsIn(["dry-run"])
  mode?: "dry-run";

  @IsOptional()
  @IsIn(["standard", "simplified"])
  invoiceType?: "standard" | "simplified";

  @IsOptional()
  @IsIn(["generated", "fixture", "uploaded"])
  source?: "generated" | "fixture" | "uploaded";
}

export class ValidateZatcaSdkFixtureDto {
  @IsString()
  fixturePath!: string;
}
