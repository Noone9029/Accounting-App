import { IsOptional, IsUUID } from "class-validator";

export class PostInventoryMovementDto {
  /** Required only for reviewed opening inventory; must be a posting equity account. */
  @IsOptional()
  @IsUUID()
  openingEquityAccountId?: string;
}
