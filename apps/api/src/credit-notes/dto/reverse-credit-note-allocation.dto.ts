import { IsOptional, IsString } from "class-validator";

export class ReverseCreditNoteAllocationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
