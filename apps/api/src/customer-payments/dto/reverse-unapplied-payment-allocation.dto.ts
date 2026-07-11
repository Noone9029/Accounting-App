import { IsOptional, IsString, Length } from "class-validator";

export class ReverseUnappliedPaymentAllocationDto {
  @IsOptional()
  @IsString()
  @Length(1, 128)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
