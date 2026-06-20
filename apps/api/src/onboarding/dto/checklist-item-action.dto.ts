import { IsOptional, IsString, MaxLength } from "class-validator";

export class ChecklistItemActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
