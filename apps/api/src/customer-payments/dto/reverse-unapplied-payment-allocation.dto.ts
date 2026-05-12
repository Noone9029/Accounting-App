import { IsOptional, IsString } from "class-validator";

export class ReverseUnappliedPaymentAllocationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
