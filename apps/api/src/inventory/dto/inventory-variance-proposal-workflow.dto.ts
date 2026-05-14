import { IsOptional, IsString } from "class-validator";

export class SubmitInventoryVarianceProposalDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveInventoryVarianceProposalDto {
  @IsOptional()
  @IsString()
  approvalNotes?: string;
}

export class ReverseInventoryVarianceProposalDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class VoidInventoryVarianceProposalDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
