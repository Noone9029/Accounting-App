import { IsOptional, IsString } from "class-validator";

export class ReversePurchaseDebitNoteAllocationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
