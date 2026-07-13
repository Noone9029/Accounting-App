import { IsInt, IsUUID, Min } from "class-validator";

export class AssignAccountingCloseTaskDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsUUID()
  assignedToUserId!: string;
}
