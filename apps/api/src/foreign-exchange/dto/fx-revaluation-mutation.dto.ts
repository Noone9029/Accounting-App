import { Transform } from "class-transformer";
import { IsString, Matches } from "class-validator";

export class FxRevaluationMutationDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Matches(/^[A-Za-z0-9._:-]{8,128}$/)
  idempotencyKey!: string;
}
